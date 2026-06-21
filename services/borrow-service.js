import { BorrowBook } from "../models/borrow.js";
import { Book } from "../models/book.js";

export const checkBorrowEligibility = async (userId, bookId) => {

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

// export const createBorrowRequest = async (userId, bookId) => {

//     const eligibility = await checkBorrowEligibility(userId, bookId);
//     if (!eligibility.status) return eligibility;

//     const existingRequest = await BorrowBook.findOne(
//         {
//             user: userId,
//             book: bookId,
//             status: 'PENDING'
//         });
//     if (existingRequest) {
//         return {
//             status: false,
//             code: 400,
//             message: "You already have a pending request for this book."
//         };
//     }

//     const book = await Book.findById(bookId);
//     if (book.availableCopies <= 0) {
//         return {
//             status: false,
//             code: 400,
//             message: "This book is currently out of stock."
//         };
//     }

//     const newRequest = await BorrowBook.create({
//         user: userId,
//         book: bookId,
//         status: 'PENDING'
//     });
//     return {
//         status: true,
//         data: newRequest
//     };
// };

