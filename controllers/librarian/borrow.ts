import { Response } from "express";
import { FilterQuery } from "mongoose";

import {
  Borrow,
  IBorrow,
} from "../../models/borrow.js";

import { getPaginatedData } from "../../utils/paginate.js";
import asyncHandler from "../../utils/async-handler.js";

import {
  approveBorrowRequestService,
  bypassQueueService,
  cancelBorrowService,
  confirmHandoverService,
  deleteBorrowService,
  getUserBorrowingHistoryService,
  payFineInPersonService,
  rejectBorrowRequestService,
  returnBookService
} from "../../services/borrow-service.js";

import {
  ApproveBorrowBody,
  ApproveBorrowParams,
  BypassQueueBody,
  CancelBorrowBody,
  ConfirmHandoverParams,
  DeleteBorrowParams,
  GetBorrowParams,
  GetBorrowsQuery,
  GetUserBorrowingHistoryParams,
  GetUserBorrowingHistoryQuery,
  PayFineInPersonBody,
  PayFineInPersonParams,
  RejectBorrowBody,
  RejectBorrowParams,
  ReturnBookBody,
  ReturnBookParams
} from "../../validations/librarian/borrow/borrow-types.js";
import { CancelBorrowParams } from "../../validations/user/borrow/borrow-types.js";
import { AuthenticatedRequest } from "../../types/auth.js";

export const approveBorrowRequest = asyncHandler(async (
  req: AuthenticatedRequest<ApproveBorrowParams, any, ApproveBorrowBody>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;
  const { approved_message } = req.body;
  const staffId = req.user!._id;

  const result = await approveBorrowRequestService({
    borrowId,
    approved_message,
    staffId,
  });

  res.status(result.code).json(result);
});

export const rejectBorrowRequest = asyncHandler(async (
  req: AuthenticatedRequest<RejectBorrowParams, any, RejectBorrowBody>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;
  const { rejected_message } = req.body;
  const staffId = req.user!._id;

  const result = await rejectBorrowRequestService({
    borrowId,
    rejected_message,
    staffId,
  });

  res.status(result.code).json(result);
});

export const cancelBorrow = asyncHandler(async (
  req: AuthenticatedRequest<CancelBorrowParams, any, CancelBorrowBody>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;
  const { canceled_message } = req.body;
  const staffId = req.user!._id;

  const result = await cancelBorrowService({
    borrowId,
    canceled_message,
    staffId,
  });

  res.status(result.code).json(result);
});

export const confirmHandover = asyncHandler(async (
  req: AuthenticatedRequest<ConfirmHandoverParams, any, any>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;
  const staffId = req.user!._id;

  const result = await confirmHandoverService({
    borrowId,
    staffId,
  });

  res.status(result.code).json(result);
});

export const returnBook = asyncHandler(async (
  req: AuthenticatedRequest<ReturnBookParams, ReturnBookBody, any>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;
  const { condition } = req.body;
  const staffId = req.user!._id;

  const result = await returnBookService({
    borrowId,
    condition,
    staffId,
  });

  res.status(result.code).json(result);
});

export const payFineInPerson = asyncHandler(async (
  req: AuthenticatedRequest<PayFineInPersonParams, PayFineInPersonBody, any>,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  const { amountPaid } = req.body;
  const staffId = req.user!._id;

  const result = await payFineInPersonService({
    userId,
    amountPaid,
    staffId,
  });

  res.status(result.code).json(result);
});

export const bypassQueueIssue = asyncHandler(async (
  req: AuthenticatedRequest<any, BypassQueueBody, any>,
  res: Response
): Promise<void> => {
  const {
    userId,
    bookId,
    reason
  } = req.body;
  const staffId = req.user!._id;

  const result = await bypassQueueService({
    userId,
    bookId,
    reason,
    staffId,
  });

  res.status(result.code).json(result);

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
  req: AuthenticatedRequest<DeleteBorrowParams,any,any>,
  res: Response
): Promise<void> => {
  const { borrowId } = req.params;

  const result = await deleteBorrowService({ borrowId });

  res.status(result.code).json(result);
});

export const getUserBorrowingHistory = asyncHandler(async (
  req: AuthenticatedRequest<GetUserBorrowingHistoryParams, any, GetUserBorrowingHistoryQuery>,
  res: Response
): Promise<void> => {
  const { userId } = req.params;

  const result = await getUserBorrowingHistoryService({ userId, req });

  res.status(result.code).json(result);
});


