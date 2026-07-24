import { Response } from "express";

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


const { RENEWAL_DAYS_EXTENSION } = BORROWING_RULES;

export const requestBorrow = asyncHandler(async (
  req: AuthenticatedRequest<RequestBorrowParams, any, any>,
  res: Response
): Promise<void> => {
  const { bookId } = req.params;
  const userId = req.user!._id;

  const eligibility = await checkBorrowEligibility(userId, bookId);
  if (!eligibility.status) {
    res.status(eligibility.code).json({ message: eligibility.message });
    return;
  };

  const book = await Book.findById(bookId);
  if (!book) {
    res.status(404).json({ success: false, message: "Book not found." });
    return;
  };

  if (book.copies_available > 0) {
    const newBorrow = await Borrow.create({
      user: userId,
      book: bookId,
      status: "PENDING",
      request_date: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Borrow request submitted successfully and is awaiting staff approval.",
      data: {
        type: "BORROW",
        borrow: newBorrow,
      },
    });
    return;
  };
  
  const existingReservation = await Reservation.findOne({
    user: userId,
    book: bookId,
    status: { $in: ["PENDING", "READY_FOR_PICKUP"] },
  });

  if (existingReservation) {
    res.status(400).json({
      success: false,
      message: "You are already on the waiting list for this book.",
    });
    return;
  }

  const queuePosition = await Reservation.countDocuments({
    book: bookId,
    status: "PENDING",
  }) + 1;

  const newReservation = await Reservation.create({
    user: userId,
    book: bookId,
    status: "PENDING",
  });

  res.status(201).json({
    success: true,
    message: `All copies are currently borrowed. You have been placed on the waiting list (Queue Position #${queuePosition}).`,
    data: {
      type: "RESERVATION",
      reservation: newReservation,
      queuePosition,
    },
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



