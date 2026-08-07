import { Response } from "express";

import asyncHandler from "../../utils/async-handler.js";

import {
  CancelBorrowParams,
  RenewBorrowParams,
  RequestBorrowParams,
} from "../../validations/user/borrow/borrow-types.js";
import { AuthenticatedRequest } from "../../types/auth.js";
import {
  cancelBorrowRequestService,
  renewBorrowService,
  requestBorrowService
} from "../../services/userBorrow-service.js";

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

  const result = await renewBorrowService({
    borrowId,
    userId,
  });

  res.status(result.code).json(result);
});



