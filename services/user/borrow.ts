import mongoose from "mongoose";

import { checkBorrowEligibility, checkCancellationEligibility } from "../librarian/borrow.js";
import { Book } from "../../models/book.js";
import { Borrow } from "../../models/borrow.js";
import { Reservation } from "../../models/reservation.js";
import { processNextInLineOrRestock } from "../reservation-service.js";
import { BORROWING_RULES } from "../../constants/library-rules.js";

const { RENEWAL_DAYS_EXTENSION } = BORROWING_RULES;


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

export const renewBorrowService = async ({
  borrowId,
  userId,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch active borrow record within session
    const borrow = await Borrow.findOne({
      _id: borrowId,
      user: userId,
      status: "ACTIVE",
    }).session(session);

    if (!borrow) {
      await session.abortTransaction();
      session.endSession();
      return {
        status: false,
        code: 404,
        message: "Active borrow record not found.",
      };
    }

    // 2. Check if already renewed
    if (borrow.renewed) {
      await session.abortTransaction();
      session.endSession();
      return {
        status: false,
        code: 400,
        message: "The maximum number of renewals (1) has been reached for this loan.",
      };
    }

    // 3. Check if loan is overdue
    const currentDate = new Date();
    if (currentDate > borrow.due_date) {
      await session.abortTransaction();
      session.endSession();
      return {
        status: false,
        code: 400,
        message: "Cannot renew an overdue book. Please return it to the library to settle any late fees.",
      };
    }

    // 4. Check if other patrons are waiting on the hold queue
    const pendingHoldCount = await Reservation.countDocuments({
      book: borrow.book,
      status: "PENDING",
    }).session(session);

    if (pendingHoldCount > 0) {
      await session.abortTransaction();
      session.endSession();
      return {
        status: false,
        code: 400,
        message: "Renewal unavailable. Another patron is currently on the waiting list for this title.",
      };
    }

    // 5. Calculate new due date and save
    const newDueDate = new Date(borrow.due_date);
    newDueDate.setDate(newDueDate.getDate() + RENEWAL_DAYS_EXTENSION);

    borrow.renewed = true;
    borrow.due_date = newDueDate;
    await borrow.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Re-populate for response payload
    await borrow.populate("book");

    return {
      status: true,
      code: 200,
      message: `Book renewal approved. Due date extended by ${RENEWAL_DAYS_EXTENSION} days.`,
      data: {
        borrow,
        newDueDate: borrow.due_date,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};