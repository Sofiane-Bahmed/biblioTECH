import { User } from "../models/user.js";
import { BorrowBook } from "../models/borrow.js";

export const checkBorrowEligibility = async (userId, bookId) => {
    const user = await User.findById(userId);

    if (user.suspension_date && user.suspension_date > new Date()) {
        return {
            status: false,
            code: 403,
            message: `Your account is suspended until ${user.suspension_date}`
        };
    }

    if (user.isBlocked) {
        return {
            status: false,
            code: 403,
            message: "Your account is blocked. Please contact support."
        };
    }

    // Calculate clean month limits
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyCount = await BorrowBook.countDocuments({
        user: userId,
        borrow_date: { $gte: firstDay, $lte: lastDay },
    });

    if (monthlyCount >= 3) {
        return {
            status: false,
            code: 400,
            message: "You have already reached your limit of 3 borrowed books this month."
        };
    }

    const activeBorrow = await BorrowBook.findOne({
        user: userId,
        book: bookId,
        return_date: null
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