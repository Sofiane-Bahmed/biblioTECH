import { Response } from "express";
import mongoose from "mongoose";

import { Borrow } from "../../models/borrow.js"
import { Book, IBook } from "../../models/book.js"
import { User } from "../../models/user.js"

import { sendSuspensionWarningEmail } from "../../utils/email/suspension-warning.js";
import asyncHandler from "../../utils/async-handler.js";

import {
  checkBorrowEligibility,
  checkCancellationEligibility
} from "../../services/borrow-service.js";
import { calculateLatePenalty } from "../../services/penalty-service.js";

import { BORROWING_RULES } from "../../constants/library-rules.js";
import {
  CancelBorrowParams,
  RenewBorrowParams,
  RequestBorrowParams,
  ReturnBookParams
} from "../../validations/user/borrow/borrow-types.js";
import { AuthenticatedRequest } from "../../types/auth.js";

const { RENEWAL_DAYS_EXTENSION } = BORROWING_RULES;

export const requestBorrow = asyncHandler(async (
  req: AuthenticatedRequest<RequestBorrowParams, any, any>,
  res: Response
): Promise<void> => {

  const { bookId } = req.params;

  const userId = req.user!._id;

  const book = await Book.findById(bookId);
  if (!book || book.copies_available <= 0) {
    res.status(404)
      .json({ message: "This book is currently out of stock or unavailable." });
    return;
  }

  const alreadyRequested = await Borrow.findOne({
    user: userId,
    book: bookId,
    status: "PENDING"
  });

  if (alreadyRequested) {
    res.status(400)
      .json({ message: "You already have a pending request for this book." });
    return;
  }

  const eligibility = await checkBorrowEligibility(userId, bookId);
  if (!eligibility.status) {
    res.status(eligibility.code).json({ message: eligibility.message });
    return;
  }

  const newRequest = await Borrow.create({
    user: userId,
    book: bookId,
    status: "PENDING",
    request_date: new Date()
  });

  res.status(201).json({
    message: "Your borrow request has been submitted successfully and is awaiting admin approval.",
    request: newRequest
  });
});

export const cancelBorrowRequest = asyncHandler(async (
  req: AuthenticatedRequest<CancelBorrowParams, any, any>,
  res: Response
): Promise<void> => {

  const { borrowId } = req.params;

  const userId = req.user!._id;

  const borrowRequest = await Borrow.findOne({
    _id: borrowId,
    user: userId
  });

  if (!borrowRequest) {
    res.status(404).json({ message: "Borrow request not found." });
    return;
  }

  if (borrowRequest.status !== "PENDING") {
    res.status(400).json({
      message: `Cannot cancel this request. It has already been processed as ${borrowRequest.status}.`
    });
    return;
  }

  const eligibility = await checkCancellationEligibility(userId);
  if (!eligibility.status) {
    res.status(eligibility.code).json({ message: eligibility.message });
    return;
  }

  const canceledRequest = await Borrow.findOneAndUpdate(
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
    res.status(400).json({
      message: "Cancellation failed. The request may have just been processed by an administrator."
    });
    return;
  }

  res.status(200).json({
    message: "Your borrow request has been cancelled successfully.",
    borrow: canceledRequest
  });
});

export const returnBook = asyncHandler(async (
  req: AuthenticatedRequest<ReturnBookParams, any, any>,
  res: Response
): Promise<void> => {

  const { borrowId } = req.params;

  const userId = req.user!._id;

  const borrow = await Borrow.findOne({
    _id: borrowId,
    user: userId
  }).populate<{ book: IBook }>("book")

  if (!borrow || !borrow.book) {
    res.status(404).json({ success: false, message: "Borrow record or associated book not found." });
    return;
  }

  if (borrow.status === "RETURNED" || borrow.return_date) {
    res.status(400)
      .json({
        success: false,
        message: "This book has already been returned."
      });
    return;
  }

  if (borrow.status !== "ACTIVE") {
    res.status(400).json({
      success: false,
      message: `Cannot process return. Current log track status is marked as: ${borrow.status}`
    });
    return;
  }

  const book = borrow.book;
  const currentDate = new Date();
  const penalty = calculateLatePenalty(currentDate, borrow.due_date);

  // Multi-Document Transaction Initialization for State Alignment
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Acknowledge Return Status
    await Borrow.findByIdAndUpdate(
      borrowId,
      {
        $set: {
          status: "RETURNED",
          return_date: currentDate
        }
      },
      { session }
    );

    // Restock Inventory safely
    await Book.findByIdAndUpdate(
      book._id,
      { $inc: { copies_available: 1 } },
      { session }
    );

    // Apply Penalties across relevant streams conditionally
    if (penalty.action === "SUSPEND") {
      await User.findByIdAndUpdate(
        userId,
        { $set: { suspension_date: penalty.suspensionDate } },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Asynchronous Side-Effects (Non-Blocking)
    if (penalty.action === "WARNING") {
      sendSuspensionWarningEmail(
        { name: req.user!.name || "Valued Member", email: req.user!.email },
        { title: book.title }
      ).catch(console.error);
    }

    res.status(200).json({ success: true, message: penalty.clientMessage });

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({
      success: false,
      message: "Failed to process book return transaction safely.",
      error: error.message
    });
  }
});

export const renewBorrow = asyncHandler(async (
  req: AuthenticatedRequest<RenewBorrowParams, any, any>,
  res: Response
): Promise<void> => {

  const { borrowId } = req.params;

  const userId = req.user!._id;

  const borrow = await
    Borrow
      .findOne({
        _id: borrowId,
        user: userId
      }
      )
      .populate("book")

  if (!borrow || !borrow.book) {
    res.status(404).json({ message: "Active borrow record or associated book not found." });
    return;
  }

  if (borrow.status !== "ACTIVE") {
    res.status(400).json({
      message: `Cannot renew book. Current log track status is marked as: ${borrow.status}`
    });
    return;
  }

  if (borrow.renewed) {
    res
      .status(400)
      .json({ message: "The maximum number of renewals (1) has been reached." });
    return;
  }

  const currentDate = new Date();
  if (currentDate > borrow.due_date) {
    res
      .status(400)
      .json({ message: "Cannot renew a late book. Please return it to inventory first." });
    return;
  }

  const newDueDate = new Date(borrow.due_date);
  newDueDate.setDate(newDueDate.getDate() + RENEWAL_DAYS_EXTENSION);

  const renewedBorrow = await Borrow.findOneAndUpdate({
    _id: borrowId,
    user: userId,
    status: "ACTIVE",
    renewed: false
  },
    {
      $set: {
        renewed: true,
        due_date: newDueDate
      }
    },
    {
      new: true,
      runValidators: true
    }
  ).populate("book");

  if (!renewedBorrow) {
    res.status(400).json({
      message: "Renewal failed. The borrow record may have just been processed or is no longer eligible for renewal."
    });
    return;
  }

  res.status(200).json({
    message: `Book renewal approved. Due date extended by ${RENEWAL_DAYS_EXTENSION} days.`,
    borrow: renewedBorrow
  });
});



