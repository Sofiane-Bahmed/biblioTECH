import mongoose from "mongoose";

import { BorrowBook } from "../../models/borrow.js"
import { Book } from "../../models/book.js"
import { User } from "../../models/user.js"
import { sendSuspensionWarningEmail } from "../../utils/email-service/suspension-warning.js";
import asyncHandler from "../../utils/async-handler.js";
import { getPaginatedData } from "../../utils/paginate.js";
import { checkBorrowEligibility } from "../../services/borrow-service.js";

export const borrowBook = asyncHandler(async (req, res) => {

  const { id: bookId } = req.params;
  const userId = req.user._id;

  const book = await Book.findById(bookId);
  if (!book || book.copies_available <= 0) {
    return res
      .status(404)
      .json({ message: "Book is currently unavailable." });
  }

  const eligibility = await checkBorrowEligibility(userId, bookId);
  if (!eligibility.status) {
    return res
      .status(eligibility.code)
      .json({ message: eligibility.message });
  }

  // Execute State Updates inside an Atomic Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7-day borrowing period

    const [newBorrow] = await BorrowBook.create(
      [{
        user: userId,
        book: bookId,
        borrow_date: borrowDate,
        due_date: dueDate
      }
      ],
      { session }
    );

    // Atomically decrement stock ONLY if it's still above 0 (Handles race conditions)
    const updatedBook = await Book.findOneAndUpdate(
      {
        _id: bookId,
        copies_available: { $gt: 0 }
      },
      {
        $inc: { copies_available: -1 },
        $push: { borrows: newBorrow._id }
      },
      {
        session,
        new: true
      }
    );

    if (!updatedBook) {
      throw new Error("Book inventory depleted during processing.");
    }

    // Append history tracking to User profile
    await User.findByIdAndUpdate(
      userId,
      { $push: { borrows: newBorrow._id } },
      { session }
    );

    // Commit all changes across collections cleanly
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Book borrowed successfully",
      borrow: newBorrow
    });

  } catch (error) {
    // If anything fails, undo all changes cleanly
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      message: "Failed to process transaction securely.",
      error: error.message
    });
  }
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

  const result = await getPaginatedData({
    model: BorrowBook,
    query: { user: userId },
    req,
    populate: [{ path: "book", select: "title author" }]
  })

  if (!result.data.length) {
    return res.status(200).json({ message: "No borrowing history found", history: [] });
  }

  res.status(200).json(result);

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

  // Check if the user is suspended
  const user = await User.findById(userId);
  if (user.suspension_date && user.suspension_date > new Date()) {
    return res.status(403).json({
      message: "Your account is suspended",
      until: user.suspension_date.toString()
    });
  };

  // Check if the user is blocked
  if (user.isBlocked) {
    return res.status(403).json({
      message: "Your account is blocked. Please contact support for more information."
    });
  };

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

