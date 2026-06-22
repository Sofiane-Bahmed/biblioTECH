import { BorrowBook } from "../models/borrow.js";
import { Book } from "../models/book.js";

export const checkBorrowEligibility = async (userId, bookId) => {

    // Calculate clean month limits
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyCount = await BorrowBook.countDocuments({
        user: userId,
        status: { $in: ["ACTIVE", "RETURNED"] },
        borrow_date: { $gte: firstDay, $lte: lastDay },
    });

    if (monthlyCount >= 3) {
        return {
            status: false,
            code: 400,
            message: "You have already reached your limit of 3 borrowed books this month."
        };
    }

    const pendingCount = await BorrowBook.countDocuments({
        user: userId,
        status: "PENDING",
        request_date: { $gte: firstDay, $lte: lastDay }
    })

    if (pendingCount >= 5) {
        return {
            status: false,
            code: 400,
            message: "You have already reached your quota of 5 pending borrow requests for this month."
        }
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

