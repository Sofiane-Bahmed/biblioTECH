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
import { AuthenticatedRequest } from "../../types/auth.js";
import { createStaffService, updateUserRoleService } from "../../services/adminUser-service.js";

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

  const query = req.query;
  const { page, limit } = query;

  const skip = (page - 1) * limit;

  const [users, totalUsers] = await Promise.all([
    User
      .find()
      .skip(skip)
      .limit(limit),
    User.countDocuments()
  ]);

  if (!users || !users.length) {
    res.status(200).json({
      success: true,
      message: "No users found in this matching viewport slice.",
      totalPages: 0,
      currentPage: page,
      totalUsers: 0,
      data: []
    });
    return;
  }

  res.status(200).json({
    success: true,
    count: users.length,
    totalPages: Math.ceil(totalUsers / limit),
    currentPage: page,
    totalUsers: totalUsers,
    data: users
  });
});

export const blockUser = asyncHandler(async (
  req: AuthenticatedRequest<BlockUserParams, any, any>,
  res: Response
): Promise<void> => {
  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  if (user.isBlocked) {
    res.status(400).json({ message: "User is already blocked" });
    return;
  }

  if (user.role === "admin") {
    res.status(400).json({ message: "You cannot block an admin user" });
    return;
  }

  if (user.suspension_date && user.suspension_date > new Date()) {
    res.status(400).json({ message: "User is already suspended until " + user.suspension_date.toISOString() });
    return;
  }

  const blockedUser = await User.findOneAndUpdate(
    {
      _id: userId,
      isBlocked: false,
      role: { $ne: "admin" },
      $or: [
        { suspension_date: { $exists: false } },
        { suspension_date: { $lte: new Date() } }
      ]
    },
    { $set: { isBlocked: true } },
    {
      new: true, runValidators: true
    },
  )

  if (!blockedUser) {
    res.status(400).json({ message: "User could not be blocked. Please check the user status and try again." });
    return;
  }


  res.status(200).json({ message: "User blocked successfully", blockedUser });
});

export const unblockUser = asyncHandler(async (
  req: AuthenticatedRequest<UnblockUserParams, any, any>,
  res: Response
): Promise<void> => {
  const { userId } = req.params;

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { isBlocked: false } },
    { new: true, runValidators: true }
  );

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({ message: "User unblocked successfully", user });
});





