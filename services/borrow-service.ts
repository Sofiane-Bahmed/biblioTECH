import mongoose, { Types } from "mongoose";

import { Borrow } from "../models/borrow.js";
import { User } from "../models/user.js";
import { Book, IBook } from "../models/book.js";
import { Reservation } from "../models/reservation.js";
import { AuditLog } from "../models/audit-log.js";

import { BORROWING_RULES, TIME_CONSTANTS } from "../constants/library-rules.js";
import { sendPickupReadyEmail } from "../utils/email/pickup-ready.js";
import { sendSuspensionWarningEmail } from "../utils/email/suspension-warning.js";
import { sendHoldReadyEmail } from "../utils/email/hold-ready-email.js";
import { calculateLatePenalty } from "./penalty-service.js";
import { getPaginatedData } from "../utils/paginate.js";

const {
    BORROWS_PER_MONTH,
    PENDING_BORROWS_PER_MONTH,
    CANCEL_BORROWS_PER_MONTH,
    BORROW_PERIOD_DAYS
} = BORROWING_RULES;

const { MS_PER_HOUR, PICKUP_WINDOW_HOURS } = TIME_CONSTANTS;

interface EligibilitySuccess {
    status: true;
    code: number;
    message: string;
}

interface EligibilityFailure {
    status: false;
    code: number;
    message: string;
}

export type EligibilityResult = EligibilitySuccess | EligibilityFailure;

interface MonthlyBoundaries {
    firstDay: Date;
    lastDay: Date;
}

const getMonthlyBoundaries = (): MonthlyBoundaries => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { firstDay, lastDay };
};

export const checkBorrowEligibility = async (
    userId: string | Types.ObjectId,
    bookId: string | Types.ObjectId
): Promise<EligibilityResult> => {
    const { firstDay, lastDay } = getMonthlyBoundaries();

    const monthlyCount = await Borrow.countDocuments({
        user: userId,
        status: { $in: ["ACTIVE", "RETURNED"] },
        borrow_date: { $gte: firstDay, $lte: lastDay },
    });

    if (monthlyCount >= BORROWS_PER_MONTH) {
        return {
            status: false,
            code: 400,
            message: `You have already reached your limit of ${BORROWS_PER_MONTH} borrowed books this month.`
        };
    }

    const pendingCount = await Borrow.countDocuments({
        user: userId,
        status: "PENDING",
        request_date: { $gte: firstDay, $lte: lastDay }
    });

    if (pendingCount >= PENDING_BORROWS_PER_MONTH) {
        return {
            status: false,
            code: 400,
            message: `You have already reached your quota of ${PENDING_BORROWS_PER_MONTH} pending borrow requests for this month.`
        };
    }

    const existingBorrow = await Borrow.findOne({
        user: userId,
        book: bookId,
        status: { $in: ["PENDING", "ACTIVE"] }
    });

    if (existingBorrow) {
        const isPending = existingBorrow.status === "PENDING";

        return {
            status: false,
            code: 400,
            message: isPending
                ? "You already have a pending request for this book."
                : "You currently have an active borrowed copy of this book."
        }
    };

    return {
        status: true,
        code: 200,
        message: "Eligible for borrowing."
    };
};

export const checkCancellationEligibility = async (
    userId: string | Types.ObjectId
): Promise<EligibilityResult> => {
    const { firstDay, lastDay } = getMonthlyBoundaries();

    const cancelCount = await Borrow.countDocuments({
        user: userId,
        status: "CANCELED",
        updatedAt: { $gte: firstDay, $lte: lastDay }
    });

    if (cancelCount >= CANCEL_BORROWS_PER_MONTH) {
        return {
            status: false,
            code: 400,
            message: `You have already reached your quota of ${CANCEL_BORROWS_PER_MONTH} cancel borrow requests for this month.`
        };
    }

    return {
        status: true,
        code: 200,
        message: "Eligible for cancellation."
    };
};

export const bypassQueueService = async ({
    userId,
    bookId,
    reason,
    staffId,
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Validate User
        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 404,
                message: "Patron account not found.",
            };
        }

        // 2. Validate Book & Available Copies
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

        if (book.copies_available <= 0) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 400,
                message: "No physical copies are currently available in inventory.",
            };
        }

        // 3. Check if target patron already has an active loan on this book
        const existingLoan = await Borrow.findOne({
            user: userId,
            book: bookId,
            status: "ACTIVE",
        }).session(session);

        if (existingLoan) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 400,
                message: "Patron already has an active loan for this book.",
            };
        }

        // 4. Handle any active holds for this user on this book (fulfill if present)
        const userReservation = await Reservation.findOne({
            user: userId,
            book: bookId,
            status: { $in: ["PENDING", "READY_FOR_PICKUP"] },
        }).session(session);

        if (userReservation) {
            userReservation.status = "FULFILLED";
            await userReservation.save({ session });
        }

        // 5. Calculate due date
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + BORROW_PERIOD_DAYS);

        // 6. Create Active Borrow Record
        const [borrowRecord] = await Borrow.create(
            [
                {
                    user: userId,
                    book: bookId,
                    issued_by: staffId,
                    due_date: dueDate,
                    status: "ACTIVE",
                },
            ],
            { session }
        );

        // 7. Decrement available copies
        book.copies_available -= 1;
        await book.save({ session });

        // 8. Create Audit Log Entry
        await AuditLog.create(
            [
                {
                    action: "BYPASS_QUEUE_ISSUE",
                    performedBy: staffId,
                    targetUser: userId,
                    targetResource: "Borrow",
                    resourceId: borrowRecord._id,
                    details: {
                        bookId,
                        dueDays: BORROW_PERIOD_DAYS,
                        dueDate,
                        fulfilledReservation: !!userReservation,
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
            code: 201,
            message: "Book issued successfully bypassing queue.",
            data: borrowRecord,
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const approveBorrowRequestService = async ({
    borrowId,
    approved_message,
    staffId,
}) => {
    // 1. Fetch borrow request and check initial status before opening a transaction
    const borrowRequest = await Borrow.findById(borrowId).populate<{
        user;
        book;
    }>("user book");

    if (!borrowRequest || borrowRequest.status !== "PENDING") {
        return {
            status: false,
            code: 400,
            message: "Borrow request not found or has already been processed.",
        };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const pickupDeadline = new Date(Date.now() + PICKUP_WINDOW_HOURS * MS_PER_HOUR);

        // 2. Atomically transition status from PENDING to APPROVED
        const updatedBorrow = await Borrow.findOneAndUpdate(
            {
                _id: borrowRequest._id,
                status: "PENDING",
            },
            {
                $set: {
                    status: "APPROVED",
                    approved_message,
                    pickup_deadline: pickupDeadline,
                    approvedBy: staffId,
                },
            },
            { session, new: true }
        );

        if (!updatedBorrow) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 400,
                message: "This request was already processed by another session.",
            };
        }

        // 3. Atomically decrement available book inventory
        const updatedBook = await Book.findOneAndUpdate(
            {
                _id: borrowRequest.book._id || borrowRequest.book,
                copies_available: { $gt: 0 },
            },
            {
                $inc: { copies_available: -1 },
                $push: { borrows: borrowRequest._id },
            },
            { session, new: true }
        );

        if (!updatedBook) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 400,
                message: "Book inventory depleted at the moment of approval processing.",
            };
        }

        await session.commitTransaction();
        session.endSession();

        // Trigger async notification after successful transaction commit
        sendPickupReadyEmail(borrowRequest.user, borrowRequest.book, pickupDeadline).catch(
            console.error
        );

        return {
            status: true,
            code: 200,
            message: `Borrow request approved. The user has ${PICKUP_WINDOW_HOURS} hours to collect the book.`,
            data: updatedBorrow,
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const rejectBorrowRequestService = async ({
    borrowId,
    rejected_message,
    staffId,
}) => {
    // 1. Verify existence
    const borrowRequest = await Borrow.findById(borrowId);
    if (!borrowRequest) {
        return {
            status: false,
            code: 404,
            message: "Borrow request not found.",
        };
    }

    // 2. Validate current status
    if (borrowRequest.status !== "PENDING") {
        return {
            status: false,
            code: 400,
            message: `Cannot reject this request. It is already marked as ${borrowRequest.status}.`,
        };
    }

    // 3. Atomically transition status to REJECTED
    const updatedBorrow = await Borrow.findOneAndUpdate(
        {
            _id: borrowRequest._id,
            status: "PENDING",
        },
        {
            $set: {
                status: "REJECTED",
                rejected_message,
                ...(staffId && { rejectedBy: staffId }),
            },
        },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!updatedBorrow) {
        return {
            status: false,
            code: 400,
            message: "This request was already processed by another session.",
        };
    }

    return {
        status: true,
        code: 200,
        message: "Borrow request has been rejected successfully.",
        data: updatedBorrow,
    };
};

export const cancelBorrowService = async ({
    borrowId,
    canceled_message,
    staffId,
}) => {
    // 1. Verify existence
    const borrowRequest = await Borrow.findById(borrowId);

    if (!borrowRequest) {
        return {
            status: false,
            code: 404,
            message: "Borrow request not found.",
        };
    }

    // 2. Validate current status
    if (borrowRequest.status !== "ACTIVE") {
        return {
            status: false,
            code: 400,
            message: `Cannot cancel this request. It is already marked as ${borrowRequest.status}.`,
        };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 3. Atomically transition status to CANCELED
        const canceledBorrow = await Borrow.findOneAndUpdate(
            {
                _id: borrowRequest._id,
                status: "ACTIVE",
            },
            {
                $set: {
                    status: "CANCELED",
                    canceled_message,
                    ...(staffId && { canceledBy: staffId }),
                },
            },
            {
                session,
                new: true,
                runValidators: true,
            }
        );

        if (!canceledBorrow) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 400,
                message: "This request was already processed by another session.",
            };
        }

        // 4. Restock book inventory
        await Book.findByIdAndUpdate(
            borrowRequest.book,
            { $inc: { copies_available: 1 } },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return {
            status: true,
            code: 200,
            message: "Borrow request has been canceled successfully.",
            data: canceledBorrow,
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const confirmHandoverService = async ({
    borrowId,
    staffId,
}) => {
    // 1. Verify existence and current status
    const borrow = await Borrow.findById(borrowId);
    if (!borrow || borrow.status !== "APPROVED") {
        return {
            status: false,
            code: 400,
            message: "Borrow record is not in an APPROVED state awaiting handover.",
        };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const borrowDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + BORROW_PERIOD_DAYS);

        // 2. Atomically transition status from APPROVED to ACTIVE
        const updatedBorrow = await Borrow.findOneAndUpdate(
            {
                _id: borrowId,
                status: "APPROVED",
            },
            {
                $set: {
                    status: "ACTIVE",
                    borrow_date: borrowDate,
                    due_date: dueDate,
                    ...(staffId && { handedOverBy: staffId }),
                },
            },
            {
                session,
                new: true,
                runValidators: true,
            }
        );

        if (!updatedBorrow) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 400,
                message: "This request was already processed by another session.",
            };
        }

        // 3. Link borrow record to user document
        await User.findByIdAndUpdate(
            borrow.user,
            { $addToSet: { borrows: borrow._id } },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return {
            status: true,
            code: 200,
            message: "Book handed over! Active borrow period started.",
            data: updatedBorrow,
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const returnBookService = async ({
    borrowId,
    condition,
    staffId,
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Fetch borrow record with session
        const borrow = await Borrow.findById(borrowId)
            .session(session)
            .populate<{ book: IBook }>("book");

        if (!borrow || !borrow.book) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 404,
                message: "Borrow record or associated book not found.",
            };
        }

        if (borrow.status === "RETURNED") {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 400,
                message: "This book has already been returned.",
            };
        }

        const userId = borrow.user;
        const book = borrow.book;
        const dueDate = borrow.due_date;
        const currentDate = new Date();

        const penalty = calculateLatePenalty(currentDate, dueDate);

        // 2. Mark borrow record as RETURNED
        await Borrow.findByIdAndUpdate(
            borrowId,
            {
                $set: {
                    status: "RETURNED",
                    return_date: currentDate,
                    condition_on_return: condition,
                    ...(staffId && { returnedTo: staffId }),
                },
            },
            { session }
        );

        // 3. Handle queue re-assignment or inventory restock
        const nextReservation = await Reservation.findOne({
            book: book._id,
            status: "PENDING",
        })
            .sort({ createdAt: 1 })
            .session(session);

        if (nextReservation) {
            nextReservation.status = "READY_FOR_PICKUP";
            nextReservation.expires_at = new Date(Date.now() + PICKUP_WINDOW_HOURS * MS_PER_HOUR);
            await nextReservation.save({ session });
        } else {
            await Book.findByIdAndUpdate(
                book._id,
                { $inc: { copies_available: 1 } },
                { session }
            );
        }

        // 4. Apply penalties & damage fees conditionally
        if (penalty.action === "SUSPEND" || condition === "DAMAGED") {
            const updateFields: any = {};
            if (penalty.action === "SUSPEND") {
                updateFields.suspension_date = penalty.suspensionDate;
            }
            if (condition === "DAMAGED") {
                updateFields.$inc = { outstanding_fines: 15.0 };
            }

            await User.findByIdAndUpdate(userId, updateFields, { session });
        }

        await session.commitTransaction();
        session.endSession();

        // 5. Trigger post-transaction notification emails
        if (nextReservation) {
            sendHoldReadyEmail(nextReservation.user, book.title, nextReservation.expires_at).catch(console.error);
        }

        if (penalty.action === "WARNING") {
            sendSuspensionWarningEmail({ name: "Valued Member", email: "..." }, { title: book.title }).catch(console.error);
        }

        return {
            status: true,
            code: 200,
            message: "Return processed successfully.",
            data: {
                heldForQueue: !!nextReservation,
                penaltyDetails: penalty.clientMessage,
            },
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const payFineInPersonService = async ({
    userId,
    amountPaid,
    reason = "In-person cash/card fine payment",
    staffId,
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Verify User existence and fine balance
        const user = await User.findById(userId).session(session);
        if (!user || user.outstanding_fines <= 0) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 400,
                message: "No outstanding fines found for this user.",
            };
        }

        // 2. Calculate new balance (prevent negative values)
        const newBalance = Math.max(0, user.outstanding_fines - amountPaid);

        // 3. Atomically update user balance
        const updatedUser = await User.findOneAndUpdate(
            { _id: userId },
            { $set: { outstanding_fines: newBalance } },
            { session, new: true, runValidators: true }
        );

        if (!updatedUser) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 400,
                message: "Failed to update user fines.",
            };
        }

        // 4. Record Audit Log entry
        await AuditLog.create(
            [
                {
                    action: "PAY_FINE_IN_PERSON",
                    performedBy: staffId,
                    targetUser: userId,
                    targetResource: "User",
                    resourceId: userId,
                    details: {
                        amountPaid,
                        previousBalance: user.outstanding_fines,
                        remainingBalance: updatedUser.outstanding_fines,
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
            message: `Payment of $${amountPaid.toFixed(2)} recorded successfully.`,
            data: {
                userId: updatedUser._id,
                amountPaid,
                remainingBalance: updatedUser.outstanding_fines,
            },
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const getUserBorrowingHistoryService = async ({
    userId,
    req,
}) => {
    // 1. Verify user exists
    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
        return {
            status: false,
            code: 404,
            message: "User not found.",
        };
    }

    // 2. Fetch paginated borrowing records
    const result = await getPaginatedData({
        model: Borrow,
        req,
        query: { user: userId },
        populate: [
            { path: "user", select: "fullName email" },
            { path: "book", select: "title author" },
        ],
    });

    if (!result || !result.data || !result.data.length) {
        return {
            status: true,
            code: 200,
            message: "No borrowing history found for this user.",
            data: {
                ...result,
                data: [],
            },
        };
    }

    return {
        status: true,
        code: 200,
        message: "User borrowing history retrieved successfully.",
        data: result,
    };
};

export const deleteBorrowService = async ({ borrowId }) => {
    // 1. Check if record exists
    const borrow = await Borrow.findById(borrowId);

    if (!borrow) {
        return {
            status: false,
            code: 404,
            message: "Borrow record not found.",
        };
    }

    // 2. Prevent deletion of active borrows (must be returned or settled first)
    if (borrow.status === "ACTIVE") {
        return {
            status: false,
            code: 400,
            message: "Cannot delete an active borrow record. The book must be returned first.",
        };
    }

    // 3. Delete borrow record
    await Borrow.findByIdAndDelete(borrowId);

    return {
        status: true,
        code: 200,
        message: "Borrow record deleted successfully.",
    };
};

export const getBorrowByIdService = async ({ borrowId }) => {
    const borrow = await Borrow.findById(borrowId)
        .populate("user", "fullName email")
        .populate("book", "title author")
        .lean();

    if (!borrow) {
        return {
            status: false,
            code: 404,
            message: "Borrow record not found.",
        };
    }

    return {
        status: true,
        code: 200,
        message: "Borrow record details retrieved successfully.",
        data: { borrow },
    };
};