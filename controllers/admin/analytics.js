import { Book } from "../../models/book.js";
import { BorrowBook } from "../../models/borrow.js";
import asyncHandler from "../../utils/async-handler.js";

// view libary statistics
export const getLibraryStatistics = asyncHandler(async (req, res) => {

    const borrows = await BorrowBook.find();
    const books = await Book.find();

    const borrowCount = borrows.length;
    const bookCount = books.length;

    let mostBorrowedBook = { id: null, count: 0 };
    const bookCounts = {};

    for (const borrow of borrows) {
        const bookId = borrow.book;
        if (bookId in bookCounts) {
            bookCounts[bookId]++;
        } else {
            bookCounts[bookId] = 1;
        }

        if (bookCounts[bookId] > mostBorrowedBook.count) {
            mostBorrowedBook = { id: bookId, count: bookCounts[bookId] };
        }
    }

    const statistics = {
        borrowCount,
        bookCount,
        mostBorrowedBook,
        bookCounts
    };

    res.status(200).json(statistics);

}); 