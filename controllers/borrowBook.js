import { BorrowBook } from "../models/borrowBook.js"
import { Book } from "../models/book.js"
import { User } from "../models/user.js"

// borrow a book : 
export const borrowBook = async (req, res) => {
  const userId = req.user._id;
  const { bookId } = req.body;

  try {
    //check if user is suspended
    const user = await User.findById(userId);

    if (user.suspension_date && user.suspension_date > new Date()) {
      return res.status(400).json({ message: `Account suspended until ${user.suspension_date.toDateString()}` });
    }

    // Check if user has already borrowed 3 books this month 
    const date = new Date();
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const count = await BorrowBook.countDocuments({
      user: userId,
      borrow_date: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    });

    if (count >= 3) {
      return res
        .status(400)
        .json({ message: "You have already borrowed 3 books this month" });
    }

    // Check if book is available
    const book = await Book.findById(bookId);
    if (!book || book.copies_available <= 0) {
      return res.status(404).json({ message: "Book is unavailable." });
    }

    //check if user already borrowed this book
    const existingBorrow = await BorrowBook.findOne({ user: userId, book: bookId, return_date: null });
    if (existingBorrow) {
      return res.status(400).json({ message: "You have already borrowed this book" });
    }

    // Create new borrow
    const borrow_date = new Date();
    const due_date = new Date();
    due_date.setDate(due_date.getDate() + 7); // Due date is 7 days from now

    const newBorrow = await BorrowBook.create({
      user: userId,
      book: bookId,
      borrow_date,
      due_date,
    });

    // Update book availability
    book.copies_available--;
    await book.save();

    res.status(201).json({ message: "Book borrowed successfully", borrow: newBorrow });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// return book
export const returnBook = async (req, res) => {
  const userId = req.user._id;
  const { bookId } = req.body;
  const { id } = req.params;

  try {
    //  Fetch everything needed
    const [user, book, borrow] = await Promise.all([
      User.findById(userId),
      Book.findById(bookId),
      BorrowBook.findOne({ _id: id, user: userId, book: bookId })
    ]);

    if (!user || !book || !borrow) {
      return res.status(404).json({ message: "Record not found" });
    }

    // Prevent double-returning
    if (borrow.return_date) {
      return res.status(400).json({ message: "This book has already been returned" });
    }

    const currentDate = new Date();
    let message = "The book was successfully returned";

    // Handle Late Penalty
    if (currentDate > borrow.due_date) {
      const daysLate = Math.floor((currentDate - borrow.due_date) / (1000 * 60 * 60 * 24));

      if (daysLate >= 10) {
        user.suspension_date = new Date(currentDate.getTime() + 10 * 24 * 60 * 60 * 1000); //suspend for 10 days
        await user.save();
        message = "Book returned, but you are suspended for 10 days due to delay.";
      }
    }
    // Update book availability
    book.copies_available++;
    // Update borrow return date
    borrow.return_date = currentDate;

    await Promise.all([book.save(), borrow.save()]);

    res.status(200).json({ message });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

// Get borrowing history for a user
export const getBorrowingHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const borrowingHistory = await BorrowBook.find({ user: userId });

    res.status(200).json(borrowingHistory);
  } catch (error) {
    res.status(500).json({ message: "something went wrong" })
  }
}

// Renew borrowed book
export const renewBorrowedBook = async (req, res) => {
  try {
    const { borrowId } = req.params;

    // Check if borrow exists
    const existingBorrow = await BorrowBook.findById(borrowId);
    if (!existingBorrow) {
      return res.status(404).json({ message: 'Borrow not found' });
    }

    // Check if the borrow has already been renewed
    if (existingBorrow.renewed) {
      return res.status(400).json({ message: 'The maximum number of renewals has been reached' });
    }

    // Calculate new due date
    const newDueDate = new Date(existingBorrow.due_date.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Update borrow
    existingBorrow.due_date = newDueDate;
    existingBorrow.renewed = true;
    await existingBorrow.save();

    res.status(200).json({ message: 'Borrow renewed successfully', borrow: existingBorrow });

  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};

