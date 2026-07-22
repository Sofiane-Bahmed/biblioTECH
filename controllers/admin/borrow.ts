import { Response } from "express";
import mongoose, { FilterQuery } from "mongoose";

import {
  Borrow,
  IBorrow,
} from "../../models/borrow.js";
import { Book, IBook } from "../../models/book.js";
import { User } from "../../models/user.js";
import { Reservation } from "../../models/reservation.js";

import { getPaginatedData } from "../../utils/paginate.js";
import asyncHandler from "../../utils/async-handler.js";
import { PickupReadyBookInput, PickupReadyUserInput, sendPickupReadyEmail } from "../../utils/email/pickup-ready.js";
import { sendSuspensionWarningEmail } from "../../utils/email/suspension-warning.js";
import { sendHoldReadyEmail } from "../../utils/email/hold-ready-email.js";

import { calculateLatePenalty } from "../../services/penalty-service.js";

import { BORROWING_RULES, TIME_CONSTANTS } from "../../constants/library-rules.js";
import {
  ApproveBorrowBody,
  ApproveBorrowParams,
  CancelBorrowBody,
  ConfirmHandoverParams,
  DeleteBorrowParams,
  GetBorrowParams,
  GetBorrowsQuery,
  GetUserBorrowingHistoryParams,
  GetUserBorrowingHistoryQuery,
  RejectBorrowBody,
  RejectBorrowParams,
  ReturnBookBody,
  ReturnBookParams
} from "../../validations/admin/borrow/borrow-types.js";
import { CancelBorrowParams } from "../../validations/user/borrow/borrow-types.js";

import { AuthenticatedRequest } from "../../types/auth.js";

const { BORROW_PERIOD_DAYS } = BORROWING_RULES;
const { PICKUP_WINDOW_HOURS, MS } = TIME_CONSTANTS;

export const approveBorrowRequest = asyncHandler(async (
  req: AuthenticatedRequest<ApproveBorrowParams, ApproveBorrowBody, any>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;
  const { approved_message } = req.body;

  const borrowRequest = await Borrow
    .findById(borrowId)
    .populate<{ user: PickupReadyUserInput; book: PickupReadyBookInput }>("user book");

  if (!borrowRequest || borrowRequest.status !== "PENDING") {
    res.status(400).json({ message: "Borrow request not found or has already been processed." });
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const pickupDeadline = new Date(Date.now() + PICKUP_WINDOW_HOURS * MS);

    const updatedBorrow = await Borrow.findOneAndUpdate({
      _id: borrowRequest._id,
      status: "PENDING",
    },
      {
        $set: {
          status: "APPROVED",
          approved_message: approved_message,
          pickup_deadline: pickupDeadline
        }
      },
      {
        session,
        new: true
      });

    if (!updatedBorrow) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ message: "This request was already processed by another session." });
      return;
    }

    const updatedBook = await Book.findOneAndUpdate(
      {
        _id: borrowRequest.book,
        copies_available: { $gt: 0 }
      },
      {
        $inc: { copies_available: -1 },
        $push: { borrows: borrowRequest._id }
      },
      { session, new: true }
    );

    if (!updatedBook) {
      await session.abortTransaction();
      session.endSession();
      res
        .status(400)
        .json({ message: "Book inventory depleted at the moment of approval processing." });
      return;
    }

    await session.commitTransaction();
    session.endSession();

    sendPickupReadyEmail(borrowRequest.user, borrowRequest.book, pickupDeadline).catch(console.error);

    res.status(200).json({
      success: true,
      message: "Borrow request approved. The user has ${PICKUP_WINDOW_HOURS} hours to collect the book.",
      borrow: updatedBorrow
    });

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({
      success: false,
      message: "Transaction safety failure while processing admin approval.",
      error: error.message
    });
  }
});

export const rejectBorrowRequest = asyncHandler(async (
  req: AuthenticatedRequest<RejectBorrowParams, RejectBorrowBody, any>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;
  const { rejected_message } = req.body;

  const borrowRequest = await Borrow.findById(borrowId);

  if (!borrowRequest) {
    res.status(404).json({ message: "Borrow request not found." });
    return;
  }

  if (borrowRequest.status !== "PENDING") {
    res.status(400).json({
      message: `Cannot reject this request. It is already marked as ${borrowRequest.status}.`
    });
    return;
  }

  const updatedBorrow = await Borrow.findOneAndUpdate(
    {
      _id: borrowRequest._id,
      status: "PENDING"
    }, {
    $set: {
      status: "REJECTED",
      rejected_message: rejected_message
    }
  },
    {
      new: true,
      runValidators: true
    }
  )

  if (!updatedBorrow) {
    res.status(400).json({ message: "This request was already processed by another session." });
    return;
  }

  res.status(200).json({
    message: "Borrow request has been rejected successfully.",
    borrow: updatedBorrow
  });
});

export const cancelBorrow = asyncHandler(async (
  req: AuthenticatedRequest<CancelBorrowParams, CancelBorrowBody, any>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;
  const { canceled_message } = req.body;

  const borrowRequest = await Borrow.findById(borrowId);

  if (!borrowRequest) {
    res.status(404).json({ message: "Borrow request not found." });
    return;
  }

  if (borrowRequest.status !== "ACTIVE") {
    res.status(400).json({
      message: `Cannot cancel this request. It is already marked as ${borrowRequest.status}.`
    });
    return;
  }

  const canceledBorrow = await Borrow.findOneAndUpdate(
    {
      _id: borrowRequest._id,
      status: "ACTIVE"
    }, {
    $set: {
      status: "CANCELED",
      canceled_message: canceled_message
    }
  },
    {
      new: true,
      runValidators: true
    }
  )

  if (!canceledBorrow) {
    res.status(400).json({ message: "This request was already processed by another session." });
    return;
  }

  res.status(200).json({
    message: "Borrow request has been canceled successfully.",
    borrow: canceledBorrow
  });
});

export const confirmHandover = asyncHandler(async (
  req: AuthenticatedRequest<ConfirmHandoverParams, any, any>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;

  const borrow = await Borrow.findById(borrowId);
  if (!borrow || borrow.status !== "APPROVED") {
    res.status(400).json({ message: "Borrow record is not in an APPROVED state awaiting handover." });
    return;
  }

  const borrowDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + BORROW_PERIOD_DAYS);

  const updatedBorrow = await Borrow.findOneAndUpdate(
    {
      _id: borrowId,
      status: "APPROVED"
    },
    {
      $set: {
        status: "ACTIVE",
        borrow_date: borrowDate,
        due_date: dueDate
      }
    },
    {
      new: true,
      runValidators: true
    }
  )

  if (!updatedBorrow) {
    res.status(400).json({ message: "This request was already processed by another session." });
    return;
  }

  await User.findByIdAndUpdate(
    borrow.user,
    { $push: { borrows: borrow._id } },
  );

  res.status(200).json({
    success: true,
    message: "Book handed over! Active borrow period started.",
    borrow: updatedBorrow
  });
});

export const returnBook = asyncHandler(async (
  req: AuthenticatedRequest<ReturnBookParams, ReturnBookBody, any>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;
  const { condition } = req.body;

  // Initialize session early so READS are also protected within the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Pass session to the find query to ensure data consistency
    const borrow = await Borrow
      .findById(borrowId)
      .session(session)
      .populate<{ book: IBook }>("book");

    if (!borrow || !borrow.book) {
      res.status(404).json({ success: false, message: "Borrow record or associated book not found." });
      await session.abortTransaction();
      return;
    }

    if (borrow.status === "RETURNED") {
      res.status(400).json({ success: false, message: "This book has already been returned." });
      await session.abortTransaction();
      return;
    }

    const userId = borrow.user;
    const book = borrow.book;
    const dueDate = borrow.due_date;
    const currentDate = new Date();

    const penalty = calculateLatePenalty(currentDate, dueDate);

    // Acknowledge Return Status & Condition Log
    await Borrow.findByIdAndUpdate(
      borrowId,
      {
        $set: {
          status: "RETURNED",
          return_date: currentDate,
          condition_on_return: condition
        }
      },
      { session }
    );

    // Handle Waiting Lists / Reservations
    const nextReservation = await Reservation.findOne({ book: book._id, status: "PENDING" })
      .sort({ createdAt: 1 }) // First in, first out queue
      .session(session);

    if (nextReservation) {
      // Keep inventory locked, assign it directly to the waiting user
      nextReservation.status = "READY_FOR_PICKUP";
      nextReservation.expires_at = new Date(Date.now() + PICKUP_WINDOW_HOURS * MS);
      await nextReservation.save({ session });

      // Keep copies_available locked since it's going straight to a reserved shelf
    } else {
      // No one is waiting? Safely restock general inventory
      await Book.findByIdAndUpdate(
        book._id,
        { $inc: { copies_available: 1 } },
        { session }
      );
    }

    // Apply Penalties / Damage Fees conditionally
    if (penalty.action === "SUSPEND" || condition === "DAMAGED") {
      const updateFields: any = {};
      if (penalty.action === "SUSPEND") updateFields.suspension_date = penalty.suspensionDate;
      if (condition === "DAMAGED") {
        // Assume you have a balance/fine tracking stream on the user
        updateFields.$inc = { outstanding_fines: 15.00 }; // $15 flat damage fee example
      }

      await User.findByIdAndUpdate(userId, updateFields, { session });
    }

    await session.commitTransaction();
    session.endSession();

    if (nextReservation) {
      sendHoldReadyEmail(nextReservation.user, book.title, nextReservation.expires_at).catch(console.error);
    }

    if (penalty.action === "WARNING") {
      sendSuspensionWarningEmail({ name: "Valued Member", email: "..." }, { title: book.title }).catch(console.error);
    }

    res.status(200).json({
      success: true,
      message: "Return processed successfully.",
      heldForQueue: !!nextReservation,
      penaltyDetails: penalty.clientMessage
    });

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({
      success: false,
      message: "Transaction failed safely.",
      error: error.message
    });
  }
});

export const getBorrows = asyncHandler(async (
  req: AuthenticatedRequest<any, any, GetBorrowsQuery>,
  res: Response
): Promise<void> => {
  const { status, overdue } = req.query;

  const dbQuery: FilterQuery<IBorrow> = {};

  if (status) {
    dbQuery.status = status
  }

  if (overdue) {
    dbQuery.status = "ACTIVE";
    dbQuery.due_date = { $lt: new Date() };
  }

  const result = await getPaginatedData({
    model: Borrow,
    query: dbQuery,
    populate: [
      { path: 'user', select: 'fullName email' },
      { path: 'book', select: 'title author' }
    ],
    req,
  });

  if (!result.data || !result.data.length) {
    res.status(200)
      .json({
        message: "No borrowing history found",
        data: []
      });
    return;
  }

  res.status(200).json(result);

});

export const getBorrow = asyncHandler(async (
  req: AuthenticatedRequest<GetBorrowParams, any, any>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;

  const borrow = await Borrow
    .findById(borrowId)
    .populate('user', 'fullName email')
    .populate('book', 'title author');

  if (!borrow) {
    res.status(404).json({ message: "Borrow record not found" });
    return;
  }
  res.status(200).json({ data: borrow });
});

export const deleteBorrow = asyncHandler(async (
  req: AuthenticatedRequest<DeleteBorrowParams>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;

  const borrow = await Borrow.findByIdAndDelete(borrowId);
  if (!borrow) {
    res.status(404).json({ message: "Borrow record not found" });
    return;
  }
  res.status(200).json({ message: "Borrow record deleted successfully" });
});

export const getUserBorrowingHistory = asyncHandler(async (
  req: AuthenticatedRequest<GetUserBorrowingHistoryParams, any, GetUserBorrowingHistoryQuery>,
  res: Response
): Promise<void> => {
  const { userId } = req.params;

  const result = await getPaginatedData({
    model: Borrow,
    req,
    query: { user: userId },
    populate: [
      { path: "user", select: "fullName email" },
      { path: "book", select: "title author" }
    ]
  });

  if (!result.data.length) {
    res.status(200).json({ message: "No borrowing history found for this user", data: [] });
    return;
  }

  res.status(200).json(result);
});
