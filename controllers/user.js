import { User } from "../models/user.js"

import asyncHandler from "../utils/asyncHandler.js";

// Delete a user
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndDelete(id);
  if (!user) return res.status(404).json({ message: "user not found" });

  res.status(200).json({ message: "user deleted successfully" })

});

// Update a user
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    fullName,
    email,
    role
  } = req.body;

  const adminId = req.user._id;
  const adminRole = req.user.role;

  // Authorization Check
  if (adminRole !== "admin" && adminId.toString() !== id) {
    return res.status(403).json({ message: "You are not authorized to update this user" });
  }

  const updateData = { fullName, email };

  // Only an admin can change roles
  if (role) {
    if (adminRole === "admin") {
      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      updateData.role = role;
    } else {
      // If a non-admin tries to send a role, we just ignore it or send an error
      return res.status(403).json({ message: "Only admins can change roles" });
    }
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!user) return res.status(404).json({ message: "User not found" });

  res.status(200).json({ message: "User updated successfully", user });

});

// Get a user by ID (admin only)
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id)

  if (!user) return res.status(404).json({ message: "user not found" });

  res.status(200).json(user);
});

// Get all users (admin only)
export const getAllUsers = asyncHandler(async (req, res) => {

  const users = await User.find()

  res.status(200).json(users);

});

// Get my profile
export const getMyProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "user not found" });

  res.status(200).json(user);

});




