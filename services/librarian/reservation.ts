import mongoose, { ClientSession, Types } from "mongoose";

import { Book } from "../../models/book.js";
import { Reservation } from "../../models/reservation.js";
import { User } from "../../models/user.js";

import { sendHoldReadyEmail } from "../../utils/email/hold-ready-email.js";

import { TIME_CONSTANTS } from "../../constants/library-rules.js";
import { AuditLog } from "../../models/audit-log.js";

const { PICKUP_WINDOW_HOURS, MS } = TIME_CONSTANTS

export const processNextInLineOrRestock = async (
    bookId: string | Types.ObjectId,
    session?: ClientSession
): Promise<void> => {

    const nextReservation = await Reservation.findOne({
        book: bookId,
        status: "PENDING",
    })
        .sort({ createdAt: 1 }) // Primary FIFO queue ordering
        .session(session || null);

    if (!nextReservation) {
        await Book.findByIdAndUpdate(
            bookId,
            { $inc: { copies_available: 1 } },
            { session }
        );
        return;
    }

    const holdExpiration = new Date(Date.now() + PICKUP_WINDOW_HOURS * MS);

    nextReservation.status = "READY_FOR_PICKUP";
    nextReservation.expires_at = holdExpiration;
    await nextReservation.save({ session });

    const user = await User.findById(nextReservation.user).session(session || null);

    if (user) {
        // Fire-and-forget email dispatch so network latency doesn't block controller flow
        const book = await Book.findById(bookId).select("title").session(session || null);

        if (book) {
            sendHoldReadyEmail(user.email, book.title, holdExpiration).catch((err) =>
                console.error(`[Email Error] Failed sending hold notification for reservation #${nextReservation._id}:`, err)
            );
        }
    }
};

export const forceQueuePositionService = async ({
    reservationId,
    newPosition,
    reason,
    staffId,
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const targetReservation = await Reservation.findById(reservationId).session(session);

        if (!targetReservation) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 404,
                message: "Reservation not found.",
            };
        }

        if (targetReservation.status !== "PENDING") {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 400,
                message: "Only PENDING reservations can be re-ordered.",
            };
        }

        // Fetch all pending holds for this book ordered by creation date
        const pendingHolds = await Reservation.find({
            book: targetReservation.book,
            status: "PENDING",
        })
            .sort({ createdAt: 1 })
            .session(session);

        // Remove target reservation and re-insert at new target position (1-based index)
        const filteredHolds = pendingHolds.filter((h) => h._id.toString() !== reservationId);
        const targetIndex = Math.min(newPosition - 1, filteredHolds.length);

        filteredHolds.splice(targetIndex, 0, targetReservation);

        // Update timestamps sequentially to preserve queue order natively
        const baseTime = Date.now();
        for (let i = 0; i < filteredHolds.length; i++) {
            filteredHolds[i].createdAt = new Date(baseTime + i * 1000);
            await filteredHolds[i].save({ session });
        }

        // Create Audit Log within the transaction
        await AuditLog.create(
            [
                {
                    action: "FORCE_QUEUE_REORDER",
                    performedBy: staffId,
                    targetUser: targetReservation.user,
                    targetResource: "Reservation",
                    resourceId: targetReservation._id,
                    details: { newQueuePosition: targetIndex + 1 },
                    reason,
                },
            ],
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return {
            status: true,
            code: 200,
            message: `Queue position adjusted. Patron is now at position #${targetIndex + 1} in line.`,
            data: {
                newPosition: targetIndex + 1,
                reservation: targetReservation,
            },
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const placeStaffHoldService = async ({
    userId,
    bookId,
    reason,
    staffId,
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Verify User
        const targetUser = await User.findById(userId).session(session);
        if (!targetUser) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 404,
                message: "Patron account not found.",
            };
        }

        // 2. Verify Book
        const book = await Book.findById(bookId).session(session);
        if (!book) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 404,
                message: "Book not found.",
            };
        }

        // 3. Prevent duplicate active holds
        const existingHold = await Reservation.findOne({
            user: userId,
            book: bookId,
            status: { $in: ["PENDING", "READY_FOR_PICKUP"] },
        }).session(session);

        if (existingHold) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 400,
                message: "Patron already has an active hold on this book.",
            };
        }

        // 4. Create new Reservation
        const [newReservation] = await Reservation.create(
            [
                {
                    user: userId,
                    book: bookId,
                    status: "PENDING",
                },
            ],
            { session }
        );

        // 5. Create Audit Log Entry
        await AuditLog.create(
            [
                {
                    action: "STAFF_PLACE_HOLD",
                    performedBy: staffId,
                    targetUser: userId,
                    targetResource: "Reservation",
                    resourceId: newReservation._id,
                    details: { bookId },
                    reason,
                },
            ],
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return {
            status: true,
            code: 201,
            message: "Manual reservation placed successfully on behalf of patron.",
            data: newReservation,
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const extendPickupDeadlineService = async ({
    reservationId,
    extensionHours,
    reason,
    staffId,
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Verify Reservation exists
        const reservation = await Reservation.findById(reservationId).session(session);
        if (!reservation) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 404,
                message: "Reservation not found.",
            };
        }

        // 2. Validate Reservation status
        if (reservation.status !== "READY_FOR_PICKUP") {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 400,
                message: `Cannot extend deadline. Reservation status is '${reservation.status}', expected 'READY_FOR_PICKUP'.`,
            };
        }

        // 3. Calculate new expiration time
        const currentExpiry = reservation.expires_at
            ? new Date(reservation.expires_at)
            : new Date();
        const newExpiry = new Date(currentExpiry.getTime() + extensionHours * MS);

        reservation.expires_at = newExpiry;
        await reservation.save({ session });

        // 4. Create Audit Log entry
        await AuditLog.create(
            [
                {
                    action: "MANUAL_HOLD_EXTENSION",
                    performedBy: staffId,
                    targetUser: reservation.user,
                    targetResource: "Reservation",
                    resourceId: reservation._id,
                    details: {
                        oldExpiry: currentExpiry,
                        newExpiry,
                        extensionHours,
                    },
                    reason,
                },
            ],
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return {
            status: true,
            code: 200,
            message: `Pickup deadline extended by ${extensionHours} hours. New deadline: ${newExpiry.toISOString()}`,
            data: reservation,
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};