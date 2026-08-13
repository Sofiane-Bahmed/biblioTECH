import { Response } from "express";

import asyncHandler from "../../utils/async-handler.js";
import { GetMyBorrowsQuery, UpdateMyProfileBody } from "../../validations/user/profile/profile-types.js";
import { AuthenticatedRequest } from "../../types/auth.js";
import {
  getMyBorrowsService,
  getMyProfileService,
  updateMyProfileService
} from "../../services/user/profile.js";

export const getMyBorrows = asyncHandler(async (
  req: AuthenticatedRequest<any, any, GetMyBorrowsQuery>,
  res: Response
): Promise<void> => {
  const { status, overdue } = req.query;
  const userId = req.user!._id;

  const result = await getMyBorrowsService({
    userId,
    status,
    overdue,
    req,
  });

  res.status(result.code).json(result);
});

export const updateMyProfile = asyncHandler(async (
  req: AuthenticatedRequest<any, UpdateMyProfileBody, any>,
  res: Response
): Promise<void> => {
  const userId = req.user!._id;

  const result = await updateMyProfileService({
    userId,
    updateData: req.body,
  });

  res.status(result.code).json(result);
});

export const getMyProfile = asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!._id;

  const result = await getMyProfileService({ userId });

  res.status(result.code).json(result);
});




