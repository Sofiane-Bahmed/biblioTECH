import { User } from "../../models/user.js"
import { BorrowBook } from "../../models/borrow.js"

import { getPaginatedData } from "../../utils/paginate.js";
import asyncHandler from "../../utils/async-handler.js";

export const getMyBorrows = asyncHandler(async (req, res) => {

  const { status, overdue } = req.query;

  const userId = req.user._id;

  const dbQuery = { user: userId };

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
    populate: [{
      path: "book",
      select: "title author"
    }],
    req
  });

  return res.status(200).json({
    message: "User borrow records retrieved successfully.",
    result
  });
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const updateData = { ...req.body };

  const userId = req.user._id;

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!user) return res.status(404).json({ message: "User not found" });

  res.status(200).json({ message: "Profile updated successfully", user });

});

export const getMyProfile = asyncHandler(async (req, res) => {

  res.status(200).json(req.user);

});




