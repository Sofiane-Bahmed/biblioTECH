import { Book } from "../../models/book.js";
import { BorrowBook } from "../../models/borrow.js";
import asyncHandler from "../../utils/async-handler.js";

// view libary statistics
export const getLibraryStatistics = asyncHandler(async (req, res) => {

    const [bookCount, borrowCount, topBookStats] = await Promise.all([
        Book.countDocuments(),
        BorrowBook.countDocuments(),
        BorrowBook.aggregate([
            {
                $group: {
                    _id: "$book",
                    count: { $sum: 1 }, // Track the number of occurrences
                },
            },
            { $sort: { count: -1 } },
            { $limit: 1 }, // Snag just the absolute #1 record
            {
                $lookup: {
                    from: "books", // Join with the books collection
                    localField: "_id",
                    foreignField: "_id",
                    as: "bookDetails",
                },
            },
            { $unwind: "$bookDetails" },
            {
                $project: {
                    _id: 0,
                    id: "$_id",
                    count: 1,
                    title: "$bookDetails.title",
                    author: "$bookDetails.author",
                },
            },
        ]),
    ]);

    const mostBorrowedBook = topBookStats[0] || { id: null, count: 0, title: "No history yet" };

    res.status(200).json({
        bookCount,
        borrowCount,
        mostBorrowedBook,
    });
});