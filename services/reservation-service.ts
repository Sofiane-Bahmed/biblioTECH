import mongoose, { ClientSession, Types } from "mongoose";

import { Book } from "../models/book.js";
import { Reservation } from "../models/reservation.js";
import { User } from "../models/user.js";

import { sendHoldReadyEmail } from "../utils/email/hold-ready-email.js";

import { TIME_CONSTANTS } from "../constants/library-rules.js";
import { AuditLog } from "../models/audit-log.js";

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