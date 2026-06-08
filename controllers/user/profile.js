import { User } from "../../models/user.js"

import asyncHandler from "../../utils/async-handler.js";

// Update profile
export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const updateData = { ...req.body };

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
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "user not found" });

  res.status(200).json(user);

});




