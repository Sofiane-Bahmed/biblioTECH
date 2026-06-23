import { BorrowBook } from "../models/borrow.js";
import { BORROWING_RULES } from "../constants/library-rules.js";

const {
    BORROWS_PER_MONTH,
    PENDING_BORROWS_PER_MONTH,
    CANCEL_BORROWS_PER_MONTH } = BORROWING_RULES;

const getMonthlyBoundaries = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { firstDay, lastDay };
};

export const checkBorrowEligibility = async (userId, bookId) => {
    const { firstDay, lastDay } = getMonthlyBoundaries();

    const monthlyCount = await BorrowBook.countDocuments({
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

    const pendingCount = await BorrowBook.countDocuments({
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

    const activeBorrow = await BorrowBook.findOne({
        user: userId,
        book: bookId,
        status: "ACTIVE"
    });

    if (activeBorrow) {
        return {
            status: false,
            code: 400,
            message: "You are currently borrowing an unreturned copy of this book."
        };
    }

    return { status: true };
};

export const checkCancellationEligibility = async (userId) => {
    const { firstDay, lastDay } = getMonthlyBoundaries();

    const cancelCount = await BorrowBook.countDocuments({
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

    return { status: true };
};