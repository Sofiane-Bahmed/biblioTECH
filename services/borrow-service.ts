import { Types } from "mongoose";

import { Borrow } from "../models/borrow.js";

import { BORROWING_RULES } from "../constants/library-rules.js";

const {
    BORROWS_PER_MONTH,
    PENDING_BORROWS_PER_MONTH,
    CANCEL_BORROWS_PER_MONTH
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