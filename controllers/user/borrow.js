import mongoose from "mongoose";

import { BorrowBook } from "../../models/borrow.js"
import { Book } from "../../models/book.js"
import { User } from "../../models/user.js"

import { sendSuspensionWarningEmail } from "../../utils/email-service/suspension-warning.js";
import asyncHandler from "../../utils/async-handler.js";
import { getPaginatedData } from "../../utils/paginate.js";

import { checkBorrowEligibility } from "../../services/borrow-service.js";
import { calculateLatePenalty } from "../../services/penalty-service.js";

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
    const BORROW_PERIOD_DAYS = 7;
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + BORROW_PERIOD_DAYS);

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

export const returnBook = asyncHandler(async (req, res) => {

  const { id: borrowId } = req.params;

  const userId = req.user._id;

  const borrow = await
    BorrowBook.findOne({
      _id: borrowId,
      user: userId
    }).populate("book")

  if (!borrow || !borrow.book) {
    return res.status(404).json({ message: "Borrow record or associated book not found." });
  }

  if (borrow.return_date) {
    return res.status(400).json({ message: "This book has already been returned." });
  }

  const book = borrow.book;
  const currentDate = new Date();

  const penalty = calculateLatePenalty(currentDate, borrow.due_date);

  // Atomic Database Changes
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Acknowledge Return Status
    await BorrowBook.findByIdAndUpdate(
      borrowId,
      { $set: { return_date: currentDate } },
      { session });

    // Restock Inventory safely
    await Book.findByIdAndUpdate(
      book._id,
      { $inc: { copies_available: 1 } },
      { session });

    // Apply Penalties across relevant streams conditionally
    if (penalty.action === "SUSPEND") {
      await User.findByIdAndUpdate(
        userId,
        { $set: { suspension_date: penalty.suspensionDate } },
        { session });
    }

    await session.commitTransaction();
    session.endSession();

    // Asynchronous Side-Effects (Non-Blocking)
    if (penalty.action === "WARNING") {
      sendSuspensionWarningEmail(req.user, book).catch(console.error);
    }

    return res.status(200).json({ message: penalty.clientMessage });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res
      .status(500)
      .json({
        message: "Failed to process book return transaction safely.",
        error: error.message
      });
  }
});

export const getBorrowingHistory = asyncHandler(async (req, res) => {

  const userId = req.user._id;

  const result = await getPaginatedData({
    model: BorrowBook,
    query: { user: userId },
    req,
    populate: [{
      path: "book",
      select: "title author"
    }]
  })

  if (!result.data.length) {
    return res.status(200).json({
      message: "No borrowing history found",
      history: []
    });
  }

  res.status(200).json(result);

});

export const renewBorrowedBook = asyncHandler(async (req, res) => {
  const { id: borrowId } = req.params;

  const userId = req.user._id;

  const borrow = await
    BorrowBook
      .findOne({
        _id: borrowId,
        user: userId
      }
      )
      .populate("book")

  if (!borrow || !borrow.book) {
    return res.status(404).json({ message: "Active borrow record or associated book not found." });
  }

  if (borrow.renewed) {
    return res
      .status(400)
      .json({ message: "The maximum number of renewals (1) has been reached." });
  }

  const currentDate = new Date();
  if (currentDate > borrow.due_date) {
    return res
      .status(400)
      .json({ message: "Cannot renew a late book. Please return it to inventory first." });
  }

  const RENEWAL_DAYS_EXTENSION = 7;
  const newDueDate = new Date(borrow.due_date);
  newDueDate.setDate(newDueDate.getDate() + RENEWAL_DAYS_EXTENSION);

  borrow.due_date = newDueDate;
  borrow.renewed = true;
  await borrow.save();

  return res.status(200).json({
    message: `Book renewal approved. Due date extended by ${RENEWAL_DAYS_EXTENSION} days.`,
    borrow
  });
});

