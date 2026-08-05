import { Response } from "express";
import mongoose from "mongoose";

import { Borrow } from "../../models/borrow.js"
import { Book } from "../../models/book.js";
import { Reservation } from "../../models/reservation.js";

import asyncHandler from "../../utils/async-handler.js";

import {
  checkBorrowEligibility,
  checkCancellationEligibility
} from "../../services/borrow-service.js";
import { processNextInLineOrRestock } from "../../services/reservation-service.js";

import { BORROWING_RULES } from "../../constants/library-rules.js";
import {
  CancelBorrowParams,
  RenewBorrowParams,
  RequestBorrowParams,
} from "../../validations/user/borrow/borrow-types.js";
import { AuthenticatedRequest } from "../../types/auth.js";
import { cancelBorrowRequestService, requestBorrowService } from "../../services/userBorrow-service.js";


const { RENEWAL_DAYS_EXTENSION } = BORROWING_RULES;

export const BorrowRequest = asyncHandler(async (
  req: AuthenticatedRequest<RequestBorrowParams, any, any>,
  res: Response
): Promise<void> => {
  const { bookId } = req.params;
  const userId = req.user!._id;

  const result = await requestBorrowService({
    userId,
    bookId,
  });

  res.status(result.code).json(result);
});

export const cancelBorrowRequest = asyncHandler(async (
  req: AuthenticatedRequest<CancelBorrowParams, any, any>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;
  const userId = req.user!._id;

  const result = await cancelBorrowRequestService({
    borrowId,
    userId,
  });

  res.status(result.code).json(result);
});

export const renewBorrow = asyncHandler(async (
  req: AuthenticatedRequest<RenewBorrowParams, any, any>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;
  const userId = req.user!._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const borrow = await Borrow.findOne({
      _id: borrowId,
      user: userId,
      status: "ACTIVE",
    }).session(session);

    if (!borrow) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({
        success: false,
        message: "Active borrow record not found.",
      });
      return;
    }

    if (borrow.renewed) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: "The maximum number of renewals (1) has been reached for this loan.",
      });
      return;
    }

    const currentDate = new Date();
    if (currentDate > borrow.due_date) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: "Cannot renew an overdue book. Please return it to the library to settle any late fees.",
      });
      return;
    }

    // Waiting List / Reservation Check 
    const pendingHoldCount = await Reservation.countDocuments({
      book: borrow.book,
      status: "PENDING",
    }).session(session);

    if (pendingHoldCount > 0) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: "Renewal unavailable. Another patron is currently on the waiting list for this title.",
      });
      return;
    }

    // Calculate new due date and save
    const newDueDate = new Date(borrow.due_date);
    newDueDate.setDate(newDueDate.getDate() + RENEWAL_DAYS_EXTENSION);

    borrow.renewed = true;
    borrow.due_date = newDueDate;
    await borrow.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Re-populate for response payload
    await borrow.populate("book");

    res.status(200).json({
      success: true,
      message: `Book renewal approved. Due date extended by ${RENEWAL_DAYS_EXTENSION} days.`,
      data: {
        borrow,
        newDueDate: borrow.due_date,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});



