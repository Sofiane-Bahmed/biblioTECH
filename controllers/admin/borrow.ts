import { Response } from "express";
import mongoose from "mongoose";
import { FilterQuery } from "mongoose";

import {
  Borrow,
  IBorrow,
} from "../../models/borrow.js";
import { Book } from "../../models/book.js";
import { User } from "../../models/user.js";

import { getPaginatedData } from "../../utils/paginate.js";
import asyncHandler from "../../utils/async-handler.js";

import { BORROWING_RULES } from "../../constants/library-rules.js";
import {
  ApproveBorrowBody,
  ApproveBorrowParams,
  CancelBorrowBody,
  DeleteBorrowParams,
  GetBorrowParams,
  GetBorrowsQuery,
  GetUserBorrowingHistoryParams,
  GetUserBorrowingHistoryQuery,
  RejectBorrowBody,
  RejectBorrowParams
} from "../../validations/admin/borrow/borrow-types.js";
import { AuthenticatedRequest } from "../../types/auth.js";
import { CancelBorrowParams } from "../../validations/user/borrow/borrow-types.js";

const { BORROW_PERIOD_DAYS } = BORROWING_RULES;

export const approveBorrowRequest = asyncHandler(async (
  req: AuthenticatedRequest<ApproveBorrowParams, ApproveBorrowBody, any>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;
  const { approvedMessage } = req.body;

  const borrowRequest = await Borrow.findById(borrowId);
  if (!borrowRequest || borrowRequest.status !== "PENDING") {
    res.status(400).json({ message: "Borrow request not found or has already been processed." });
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + BORROW_PERIOD_DAYS);

    const updatedBorrow = await Borrow.findOneAndUpdate({
      _id: borrowRequest._id,
      status: "PENDING",
    },
      {
        $set: {
          status: "ACTIVE",
          approved_message: approvedMessage,
          borrow_date: borrowDate,
          due_date: dueDate
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

    await User.findByIdAndUpdate(
      borrowRequest.user,
      {
        $push: {
          borrows: borrowRequest._id
        }
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Borrow request approved. Book is now active.",
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
  const { rejectedMessage } = req.body;

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
      rejected_message: rejectedMessage
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
  const { canceledMessage } = req.body;

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
      canceled_message: canceledMessage
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
    message: "Borrow request has been rejected successfully.",
    borrow: canceledBorrow
  });
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
