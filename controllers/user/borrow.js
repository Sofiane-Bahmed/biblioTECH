import { BorrowBook } from "../../models/borrow.js"
import { Book } from "../../models/book.js"
import { User } from "../../models/user.js"
import { sendSuspensionWarningEmail } from "../../utils/email-service/suspension-warning.js";
import asyncHandler from "../../utils/async-handler.js";

// borrow a book
export const borrowBook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const user = await User.findById(userId);
  //check if user is suspended
  if (user.suspension_date && user.suspension_date > new Date()) {
    return res.status(403).json({
      message: "Your account is suspended",
      until: user.suspension_date.toString()
    });
  }

  //check if user is blocked
  if (user.isBlocked) {
    return res.status(403).json({
      message: "Your account is blocked. Please contact support for more information."
    });
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
  const book = await Book.findById(id);
  if (!book || book.copies_available <= 0) {
    return res.status(404).json({ message: "Book is unavailable." });
  }

  //check if user already borrowed this book
  const existingBorrow = await BorrowBook.findOne({
    user: userId,
    book: id,
    return_date: null
  });
  if (existingBorrow) {
    return res.status(400).json({ message: "You have already borrowed this book" });
  }

  // Create new borrow
  const borrow_date = new Date();
  const due_date = new Date();
  due_date.setDate(due_date.getDate() + 7); // Due date is 7 days from now

  const newBorrow = await BorrowBook.create({
    user: userId,
    book: id,
    borrow_date,
    due_date,
  });

  // Update book availability
  book.copies_available--;
  //push borrow to borrows array in book 
  book.borrows.push(newBorrow._id);
  //push borrow to borrows array in user 
  user.borrows.push(newBorrow._id);

  await Promise.all([book.save(), user.save()]);

  res.status(201).json({ message: "Book borrowed successfully", borrow: newBorrow });

});

// return book
export const returnBook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  //  Fetch everything needed
  const [user, borrow] = await Promise.all([
    User.findById(userId),
    BorrowBook
      .findOne({
        _id: id,
        user: userId
      })
      .populate("book")
  ]);

  if (!user || !borrow || !borrow.book) {
    return res.status(404).json({ message: "Record not found" });
  }

  const book = borrow.book;

  // Prevent double-returning
  if (borrow.return_date) {
    return res.status(400).json({ message: "This book has already been returned" });
  }

  const currentDate = new Date();
  let message = "The book was successfully returned";
  // Update book availability
  book.copies_available++;
  // Update borrow return date
  borrow.return_date = currentDate;

  const savedOperations = [book.save(), borrow.save()];

  // Handle Late Penalty
  if (currentDate > borrow.due_date) {
    const daysLate = Math.ceil((currentDate - borrow.due_date) / (1000 * 60 * 60 * 24));

    if (daysLate > 0 && daysLate <= 3) {
      await sendSuspensionWarningEmail(user, book);
      message = `Book returned, but it was ${daysLate} day(s) late. A warning email has been sent to you. Please return books on time to avoid suspension.`;
    }
    else if (daysLate > 3) {
      user.suspension_date = new Date(currentDate.getTime() + 10 * 24 * 60 * 60 * 1000); //suspend for 10 days
      savedOperations.push(user.save())
      message = "Book returned, but you are suspended for 10 days due to delay.";
    }
  };

  await Promise.all(savedOperations);

  res.status(200).json({ message });

});

// Get borrowing history for a user
export const getBorrowingHistory = asyncHandler(async (req, res) => {

  const userId = req.user._id;

  const history = await BorrowBook
    .find({ user: userId })
    .lean()
    .populate("book", "title author")
    .sort({ borrow_date: -1 })

  if (!history || history.length === 0) {
    return res.status(200).json({ message: "No borrowing history found", history: [] });
  }

  res.status(200).json(history)

});

// Renew borrowed book
export const renewBorrowedBook = asyncHandler(async (req, res) => {

  const { id } = req.params;
  const userId = req.user._id;

  const borrow = await BorrowBook
    .findOne({
      _id: id,
      user: userId
    })
    .populate("book")

  if (!borrow) {
    return res.status(404).json({ message: "Borrow not found" });
  }

  // Check if the associated book exists
  if (!borrow.book) {
    return res.status(404).json({ message: "Associated book not found" });
  }

  // Check if the borrow has already been renewed
  if (borrow.renewed) {
    return res.status(400).json({ message: 'The maximum number of renewals has been reached' });
  }

  // Prevent renewal if book is already late
  if (new Date() > borrow.due_date) {
    return res.status(400).json({ message: 'Cannot renew a late book. Please return it first.' });
  }

  // Calculate new due date
  const newDueDate = new Date(borrow.due_date);
  newDueDate.setDate(newDueDate.getDate() + 7);

  // Update borrow
  borrow.due_date = newDueDate;
  borrow.renewed = true;
  await borrow.save();

  res.status(200).json({
    message: 'Borrow renewed for 7 more days',
    borrow: borrow
  });
});

