import { Response } from "express";

import { User } from "../../models/user.js"
import asyncHandler from "../../utils/async-handler.js";
import {
  BlockUserParams,
  CreateStaffBody,
  DeleteUserParams,
  GetUserParams,
  GetUsersQuery,
  UnblockUserParams,
  UpdateUserRoleBody,
  UpdateUserRoleParams,
} from "../../validations/admin/user/user-types.js";
import {
  blockUserService,
  createStaffService,
  getUsersService,
  unblockUserService,
  updateUserRoleService
} from "../../services/adminUser-service.js";
import { AuthenticatedRequest } from "../../types/auth.js";

export const createStaff = asyncHandler(async (
  req: AuthenticatedRequest<any, CreateStaffBody, any>,
  res: Response
): Promise<void> => {
  const creatorId = req.user!._id;

  const result = await createStaffService({
    ...req.body,
    creatorId,
  });

  res.status(result.code).json(result);
});

export const updateUserRole = asyncHandler(async (
  req: AuthenticatedRequest<UpdateUserRoleParams, any, UpdateUserRoleBody>,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { role } = req.body;
  const userId = req.user!._id;

  const result = await updateUserRoleService({
    targetUserId: id,
    role,
    userId,
  });

  res.status(result.code).json(result);
});

export const deleteUser = asyncHandler(async (
  req: AuthenticatedRequest<DeleteUserParams, any, any>,
  res: Response)
  : Promise<void> => {
  const { userId } = req.params

  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    res.status(404).json({ message: "user not found" });
    return;
  }

  res.status(200).json({ message: "user deleted successfully" })

});

export const getUser = asyncHandler(async (
  req: AuthenticatedRequest<GetUserParams, any, any>,
  res: Response
): Promise<void> => {
  const { userId } = req.params

  const user = await User.findById(userId)

  if (!user) {
    res.status(404).json({ message: "user not found" });
    return;
  }

  res.status(200).json(user);
});

export const getUsers = asyncHandler(async (
  req: AuthenticatedRequest<any, any, GetUsersQuery>,
  res: Response
): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await getUsersService({ page, limit });

  res.status(result.code).json(result);
});

export const blockUser = asyncHandler(async (
  req: AuthenticatedRequest<BlockUserParams, any, any>,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  const staffId = req.user!._id;

  const result = await blockUserService({
    userId,
    staffId,
  });

  res.status(result.code).json(result);
});

export const unblockUser = asyncHandler(async (
  req: AuthenticatedRequest<UnblockUserParams, any, any>,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  const staffId = req.user!._id;

  const result = await unblockUserService({
    userId,
    staffId,
  });

  res.status(result.code).json(result);
});





