import mongoose from "mongoose";

import { checkBorrowEligibility, checkCancellationEligibility } from "./borrow-service.js";
import { Book } from "../models/book.js";
import { Borrow } from "../models/borrow.js";
import { Reservation } from "../models/reservation.js";
import { processNextInLineOrRestock } from "./reservation-service.js";

export const requestBorrowService = async ({
    userId,
    bookId,
}) => {
    // 1. Pre-check eligibility before starting transaction
    const eligibility = await checkBorrowEligibility(userId, bookId);
    if (!eligibility.status) {
        return {
            status: false,
            code: eligibility.code,
            message: eligibility.message,
        };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
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

        // SCENARIO A: Copies available -> Create Borrow Request
        if (book.copies_available > 0) {
            const [newBorrow] = await Borrow.create(
                [
                    {
                        user: userId,
                        book: bookId,
                        status: "PENDING",
                        request_date: new Date(),
                    },
                ],
                { session }
            );

            await session.commitTransaction();
            session.endSession();

            return {
                status: true,
                code: 201,
                message: "Borrow request submitted successfully and is awaiting staff approval.",
                data: {
                    type: "BORROW",
                    borrow: newBorrow,
                },
            };
        }

        // SCENARIO B: Out of stock -> Reservation Fallback Queue
        const existingReservation = await Reservation.findOne({
            user: userId,
            book: bookId,
            status: { $in: ["PENDING", "READY_FOR_PICKUP"] },
        }).session(session);

        if (existingReservation) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 400,
                message: "You are already on the waiting list for this book.",
            };
        }

        // Calculate queue position atomically within transaction isolation
        const pendingCount = await Reservation.countDocuments({
            book: bookId,
            status: "PENDING",
        }).session(session);

        const queuePosition = pendingCount + 1;

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

        await session.commitTransaction();
        session.endSession();

        return {
            status: true,
            code: 201,
            message: `All copies are currently borrowed. You have been placed on the waiting list (Queue Position #${queuePosition}).`,
            data: {
                type: "RESERVATION",
                reservation: newReservation,
                queuePosition,
            },
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const cancelBorrowRequestService = async ({
    borrowId,
    userId,
}) => {
    // 1. Verify eligibility prior to starting database transaction
    const eligibility = await checkCancellationEligibility(userId);
    if (!eligibility.status) {
        return {
            status: false,
            code: eligibility.code,
            message: eligibility.message,
        };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 2. Check standard Borrow Request
        const borrowRequest = await Borrow.findOne({
            _id: borrowId,
            user: userId,
        }).session(session);

        if (borrowRequest) {
            if (borrowRequest.status !== "PENDING") {
                await session.abortTransaction();
                session.endSession();
                return {
                    status: false,
                    code: 400,
                    message: `Cannot cancel this borrow request. Current status: ${borrowRequest.status}.`,
                };
            }

            borrowRequest.status = "CANCELED";
            await borrowRequest.save({ session });

            await session.commitTransaction();
            session.endSession();

            return {
                status: true,
                code: 200,
                message: "Your borrow request has been cancelled successfully.",
                data: { type: "BORROW", request: borrowRequest },
            };
        }

        // 3. Check Reservation Request (Waiting list fallback)
        const reservation = await Reservation.findOne({
            _id: borrowId,
            user: userId,
        }).session(session);

        if (reservation) {
            if (!["PENDING", "READY_FOR_PICKUP"].includes(reservation.status)) {
                await session.abortTransaction();
                session.endSession();
                return {
                    status: false,
                    code: 400,
                    message: `Cannot cancel this reservation. Current status: ${reservation.status}.`,
                };
            }

            const wasReadyForPickup = reservation.status === "READY_FOR_PICKUP";
            reservation.status = "CANCELED";
            await reservation.save({ session });

            // Pass held book to next in line or restock general inventory
            if (wasReadyForPickup) {
                await processNextInLineOrRestock(reservation.book, session);
            }

            await session.commitTransaction();
            session.endSession();

            return {
                status: true,
                code: 200,
                message: "You have been removed from the waiting list.",
                data: { type: "RESERVATION", request: reservation },
            };
        }

        // 4. Neither record found
        await session.abortTransaction();
        session.endSession();

        return {
            status: false,
            code: 404,
            message: "Request or reservation not found.",
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};