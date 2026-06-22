import { User } from "../../models/user.js"
import { BorrowBook } from "../../models/borrow.js"

import asyncHandler from "../../utils/async-handler.js";

export const getMyActiveBorrows = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const activeBorrows = await BorrowBook.find({
    user: userId,
    status: "ACTIVE"
  })
    .populate("book", "title author")
    .select("-__v");

  return res.status(200).json({
    message: "Current active borrowed books retrieved successfully",
    books: activeBorrows
  });
});

export const getMyPendingBorrows = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const pendingBorrows = await BorrowBook.find({
    user: userId,
    status: "PENDING"
  })
    .populate("book", "title author")
    .select("-__v");

  return res.status(200).json({
    message: "Current pending borrowed books retrieved successfully",
    books: pendingBorrows
  });
});



export const updateProfile = asyncHandler(async (req, res) => {
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

// Get my profile
export const getMyProfile = asyncHandler(async (req, res) => {

  res.status(200).json(req.user);

});




