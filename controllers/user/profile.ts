import { Response } from "express";
import { FilterQuery } from "mongoose";

import { User } from "../../models/user.js"
import { Borrow, IBorrow } from "../../models/borrow.js"

import { getPaginatedData } from "../../utils/paginate.js";
import asyncHandler from "../../utils/async-handler.js";
import { GetMyBorrowsQuery, UpdateMyProfileBody } from "../../validations/user/profile/profile-types.js";
import { AuthenticatedRequest } from "../../types/auth.js";

export const getMyBorrows = asyncHandler(async (
  req: AuthenticatedRequest<any, any, GetMyBorrowsQuery>,
  res: Response
): Promise<void> => {

  const { status, overdue } = req.query;

  const userId = req.user!._id;

  const dbQuery: FilterQuery<IBorrow> = { user: userId };

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
    populate: [{
      path: "book",
      select: "title author"
    }],
    req
  });

  if (!result.data || !result.data.length) {
    res.status(200)
      .json({
        message: "No borrowing history found",
        data: []
      });
    return;
  }

  res.status(200).json({
    message: "User borrow records retrieved successfully.",
    result
  });
});

export const updateMyProfile = asyncHandler(async (
  req: AuthenticatedRequest<any, UpdateMyProfileBody, any>,
  res: Response
): Promise<void> => {

  const updateData = { ...req.body }

  const userId = req.user!._id;

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!user) {
    res.status(404).json({ message: "User not found" })
    return;
  };

  res.status(200).json({ message: "Profile updated successfully", user });

});

export const getMyProfile = asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {

  const userProfile = await User.findById(req.user!._id);
  
  if (!userProfile) {
    res.status(404).json({ message: "user not found" })
  }

  res.status(200).json(userProfile);

});




