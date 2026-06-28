import mongoose from "mongoose";

import { BorrowBook } from "../../models/borrow.js";
import { Book } from "../../models/book.js";
import { User } from "../../models/user.js";

import { getPaginatedData } from "../../utils/paginate.js";
import asyncHandler from "../../utils/async-handler.js";

import { BORROWING_RULES } from "../../constants/library-rules.js";

const { BORROW_PERIOD_DAYS } = BORROWING_RULES;

export const approveBorrowRequest = asyncHandler(async (req, res) => {
  const { borrowId } = req.params;

  const borrowRequest = await BorrowBook.findById(borrowId);
  if (!borrowRequest || borrowRequest.status !== "PENDING") {
    return res.status(400).json({ message: "Borrow request not found or has already been processed." });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + BORROW_PERIOD_DAYS);

    const updatedBorrow = await BorrowBook.findOneAndUpdate({
      _id: borrowRequest._id,
      status: "PENDING",
    },
      {
        $set: {
          status: "ACTIVE",
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
      return res.status(400).json({ message: "This request was already processed by another session." });
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
      return res
        .status(400)
        .json({ message: "Book inventory depleted at the moment of approval processing." });
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

    return res.status(200).json({
      message: "Borrow request approved. Book is now active.",
      borrow: updatedBorrow
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      message: "Transaction safety failure while processing admin approval.",
      error: error.message
    });
  }
});

export const rejectBorrowRequest = asyncHandler(async (req, res) => {
  const { borrowId } = req.params;

  const borrowRequest = await BorrowBook.findById(borrowId);

  if (!borrowRequest) {
    return res.status(404).json({ message: "Borrow request not found." });
  }

  if (borrowRequest.status !== "PENDING") {
    return res.status(400).json({
      message: `Cannot reject this request. It is already marked as ${borrowRequest.status}.`
    });
  }

  borrowRequest.status = "REJECTED";

  await borrowRequest.save();

  return res.status(200).json({
    message: "Borrow request has been rejected successfully.",
    borrow: borrowRequest
  });
});

export const getBorrows = asyncHandler(async (req, res) => {
  const { status, overdue } = req.query;

  const dbQuery = {};

  if (status) {
    dbQuery.status = status
  }

  if (overdue) {
    dbQuery.status = "ACTIVE";
    dbQuery.due_date = { $lt: new Date() };
  }

  const result = await getPaginatedData({
    model: BorrowBook,
    query: dbQuery,
    populate: [
      { path: 'user', select: 'fullName email' },
      { path: 'book', select: 'title author' }
    ],
    req,
  });

  if (!result.data.length) {
    return res.status(200).json({ message: "No borrowing history found", data: [] });
  }

  res.status(200).json(result);

});

export const getBorrow = asyncHandler(async (req, res) => {
  const { borrowId } = req.params;

  const borrow = await BorrowBook
    .findById(borrowId)
    .populate('user', 'fullName email')
    .populate('book', 'title author');

  if (!borrow) {
    return res.status(404).json({ message: "Borrow record not found" });
  }
  res.status(200).json({ data: borrow });
});

export const deleteBorrow = asyncHandler(async (req, res) => {
  const { borrowId } = req.params;

  const borrow = await BorrowBook.findByIdAndDelete(borrowId);
  if (!borrow) {
    return res.status(404).json({ message: "Borrow record not found" });
  }
  res.status(200).json({ message: "Borrow record deleted successfully" });
});

export const getUserBorrowingHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const result = await getPaginatedData({
    model: BorrowBook,
    req,
    query: { user: userId },
    populate: [
      { path: "user", select: "fullName email" },
      { path: "book", select: "title author" }
    ]
  });

  if (!result.data.length) {
    return res.status(200).json({ message: "No borrowing history found for this user", data: [] });
  }

  res.status(200).json(result);
});
