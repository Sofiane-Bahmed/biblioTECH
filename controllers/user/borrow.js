import mongoose from "mongoose";

import { BorrowBook } from "../../models/borrow.js"
import { Book } from "../../models/book.js"
import { User } from "../../models/user.js"

import { sendSuspensionWarningEmail } from "../../utils/email-service/suspension-warning.js";
import asyncHandler from "../../utils/async-handler.js";
import { getPaginatedData } from "../../utils/paginate.js";

import {
  checkBorrowEligibility,
  checkCancellationEligibility
} from "../../services/borrow-service.js";
import { calculateLatePenalty } from "../../services/penalty-service.js";

import { BORROWING_RULES } from "../../constants/library-rules.js";

const { RENEWAL_DAYS_EXTENSION } = BORROWING_RULES;

export const requestBorrow = asyncHandler(async (req, res) => {

  const { bookId } = req.params;

  const userId = req.user._id;

  const book = await Book.findById(bookId);
  if (!book || book.copies_available <= 0) {
    return res.status(404).json({ message: "This book is currently out of stock or unavailable." });
  }

  const alreadyRequested = await BorrowBook.findOne({
    user: userId,
    book: bookId,
    status: "PENDING"
  });

  if (alreadyRequested) {
    return res.status(400).json({ message: "You already have a pending request for this book." });
  }

  const eligibility = await checkBorrowEligibility(userId, bookId);
  if (!eligibility.status) {
    return res.status(eligibility.code).json({ message: eligibility.message });
  }

  const newRequest = await BorrowBook.create({
    user: userId,
    book: bookId,
    status: "PENDING",
    request_date: new Date()
  });

  return res.status(201).json({
    message: "Your borrow request has been submitted successfully and is awaiting admin approval.",
    request: newRequest
  });
});

// PATCH /api/books/requests/:borrowId/cancel
export const cancelBorrowRequest = asyncHandler(async (req, res) => {
  const { borrowId } = req.params;
  const userId = req.user._id;

  const borrowRequest = await BorrowBook.findOne({
    _id: borrowId,
    user: userId
  });

  if (!borrowRequest) {
    return res.status(404).json({ message: "Borrow request not found." });
  }

  if (borrowRequest.status !== "PENDING") {
    return res.status(400).json({
      message: `Cannot cancel this request. It has already been processed as ${borrowRequest.status}.`
    });
  }

  const eligibility = await checkCancellationEligibility(userId);
  if (!eligibility.status) {
    return res.status(eligibility.code).json({ message: eligibility.message });
  }

  const canceledRequest = await BorrowBook.findOneAndUpdate(
    {
      _id: borrowId,
      user: userId,
      status: "PENDING"
    },
    {
      $set: { status: "CANCELED" }
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!canceledRequest) {
    return res.status(400).json({
      message: "Cancellation failed. The request may have just been processed by an administrator."
    });
  }

  return res.status(200).json({
    message: "Your borrow request has been cancelled successfully.",
    borrow: canceledRequest
  });
});

export const returnBook = asyncHandler(async (req, res) => {

  const { borrowId } = req.params;

  const userId = req.user._id;

  const borrow = await
    BorrowBook.findOne({
      _id: borrowId,
      user: userId
    }).populate("book")

  if (!borrow || !borrow.book) {
    return res.status(404).json({ message: "Borrow record or associated book not found." });
  }

  if (borrow.status === "RETURNED" || borrow.return_date) {
    return res.status(400).json({ message: "This book has already been returned." });
  }

  if (borrow.status !== "ACTIVE") {
    return res.status(400).json({
      message: `Cannot process return. Current log track status is marked as: ${borrow.status}`
    });
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
      {
        $set: {
          status: "RETURNED",
          return_date: currentDate
        }
      },
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

export const renewBorrowedBook = asyncHandler(async (req, res) => {
  const { borrowId } = req.params;

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

  if (borrow.status !== "ACTIVE") {
    return res.status(400).json({
      message: `Cannot renew book. Current log track status is marked as: ${borrow.status}`
    });
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



