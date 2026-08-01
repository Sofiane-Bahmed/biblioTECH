import mongoose, { Types } from "mongoose";

import { Borrow } from "../models/borrow.js";
import { User } from "../models/user.js";
import { Book } from "../models/book.js";
import { Reservation } from "../models/reservation.js";
import { AuditLog } from "../models/audit-log.js";

import { BORROWING_RULES } from "../constants/library-rules.js";

const {
    BORROWS_PER_MONTH,
    PENDING_BORROWS_PER_MONTH,
    CANCEL_BORROWS_PER_MONTH,
    BORROW_PERIOD_DAYS
} = BORROWING_RULES;

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