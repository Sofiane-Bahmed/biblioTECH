import { User } from "../../models/user.js"

import asyncHandler from "../../utils/asyncHandler.js";

// Delete a user
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndDelete(id);
  if (!user) return res.status(404).json({ message: "user not found" });

  res.status(200).json({ message: "user deleted successfully" })

});

// Get a user by ID 
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id)

  if (!user) return res.status(404).json({ message: "user not found" });

  res.status(200).json(user);
});

// Get all users
export const getAllUsers = asyncHandler(async (req, res) => {

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [users, totalUsers] = await Promise.all([
    User
      .find()
      .skip(skip)
      .limit(limit),
    User.countDocuments()
  ]);

  if (!users.length) return res.status(404).json({ message: "No users found" });

  res.status(200).json({
    success: true,
    count: users.length,
    totalPages: Math.ceil(totalUsers / limit),
    currentPage: page,
    totalUsers: totalUsers,
    data: users
  });

});





