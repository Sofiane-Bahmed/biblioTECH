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

import { BORROWING_RULES } from "../../constants/library-rules.js";
import {
  CancelBorrowParams,
  RenewBorrowParams,
  RequestBorrowParams,
} from "../../validations/user/borrow/borrow-types.js";
import { AuthenticatedRequest } from "../../types/auth.js";
import { processNextInLineOrRestock } from "../../services/reservation-service.js";


const { RENEWAL_DAYS_EXTENSION } = BORROWING_RULES;

export const requestBorrow = asyncHandler(async (
  req: AuthenticatedRequest<RequestBorrowParams, any, any>,
  res: Response
): Promise<void> => {
  const { bookId } = req.params;
  const userId = req.user!._id;

  const eligibility = await checkBorrowEligibility(userId, bookId);
  if (!eligibility.status) {
    res.status(eligibility.code).json({ success: false, message: eligibility.message });
    return;
  }

  // Start atomic session & transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const book = await Book.findById(bookId).session(session);
    if (!book) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ success: false, message: "Book not found." });
      return;
    }

    // SCENARIO A: Copies available -> Create Borrow Request
    if (book.copies_available > 0) {
      const [newBorrow] = await Borrow.create(
        [
          {
            user: userId,
            book: bookId,
            status: "PENDING",
            request_date: new Date(),
          },
        ],
        { session } 
      );

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        success: true,
        message: "Borrow request submitted successfully and is awaiting staff approval.",
        data: {
          type: "BORROW",
          borrow: newBorrow,
        },
      });
      return;
    }

    // SCENARIO B: Out of stock -> Reservation Fallback Queue
    const existingReservation = await Reservation.findOne({
      user: userId,
      book: bookId,
      status: { $in: ["PENDING", "READY_FOR_PICKUP"] },
    }).session(session);

    if (existingReservation) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: "You are already on the waiting list for this book.",
      });
      return;
    }

    // Calculate queue position atomically within transaction isolation
    const pendingCount = await Reservation.countDocuments({
      book: bookId,
      status: "PENDING",
    }).session(session);

    const queuePosition = pendingCount + 1;

    const [newReservation] = await Reservation.create(
      [
        {
          user: userId,
          book: bookId,
          status: "PENDING",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: `All copies are currently borrowed. You have been placed on the waiting list (Queue Position #${queuePosition}).`,
      data: {
        type: "RESERVATION",
        reservation: newReservation,
        queuePosition,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

export const cancelRequest = asyncHandler(async (
  req: AuthenticatedRequest<CancelBorrowParams, any, any>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;
  const userId = req.user!._id;

  const eligibility = await checkCancellationEligibility(userId);
  if (!eligibility.status) {
    res.status(eligibility.code).json({ success: false, message: eligibility.message });
    return;
  }

  // Start atomic session & transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Check Borrow Request first (passing session)
    const borrowRequest = await Borrow
      .findOne({
        _id: borrowId,
        user: userId
      })
      .session(session);

    if (borrowRequest) {
      if (borrowRequest.status !== "PENDING") {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({
          success: false,
          message: `Cannot cancel this borrow request. Current status: ${borrowRequest.status}.`,
        });
        return;
      }

      borrowRequest.status = "CANCELED";
      await borrowRequest.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        success: true,
        message: "Your borrow request has been cancelled successfully.",
        data: { type: "BORROW", request: borrowRequest },
      });
      return;
    }

    // 2. Check Reservation Request (passing session)
    const reservation = await Reservation
      .findOne({
        _id: borrowId,
        user: userId
      })
      .session(session);

    if (reservation) {
      if (!["PENDING", "READY_FOR_PICKUP"].includes(reservation.status)) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({
          success: false,
          message: `Cannot cancel this reservation. Current status: ${reservation.status}.`,
        });
        return;
      }

      const wasReadyForPickup = reservation.status === "READY_FOR_PICKUP";
      reservation.status = "CANCELED";
      await reservation.save({ session });

      // Pass held book to next in line or restock (passing session into helper)
      if (wasReadyForPickup) {
        await processNextInLineOrRestock(reservation.book, session);
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        success: true,
        message: "You have been removed from the waiting list.",
        data: { type: "RESERVATION", request: reservation },
      });
      return;
    }

    // 3. Neither found
    await session.abortTransaction();
    session.endSession();

    res.status(404).json({
      success: false,
      message: "Request or reservation not found.",
    });
  } catch (error) {
    // Rollback all DB operations if anything fails
    await session.abortTransaction();
    session.endSession();
    throw error; // Let asyncHandler forward to global error handler
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



