import { User } from "../../models/user.js"
import asyncHandler from "../../utils/async-handler.js";

export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const userId = req.user._id;
  
  if (userId === id) {
    return res.status(400).json({ message: "You cannot change your own administrative role" });
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { role } },
    { new: true, runValidators: true }
  );

  if (!user) return res.status(404).json({ message: "User not found" });

  res.status(200).json({
    message: `User role successfully updated to ${role}`,
    user
  });

});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndDelete(id);
  if (!user) return res.status(404).json({ message: "user not found" });

  res.status(200).json({ message: "user deleted successfully" })

});

export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id)

  if (!user) return res.status(404).json({ message: "user not found" });

  res.status(200).json(user);
});

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

export const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { isBlocked: true } },
    { new: true, runValidators: true }
  );

  if (!user) return res.status(404).json({ message: "User not found" });

  res.status(200).json({ message: "User blocked successfully", user });
});

export const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { isBlocked: false } },
    { new: true, runValidators: true }
  );

  if (!user) return res.status(404).json({ message: "User not found" });

  res.status(200).json({ message: "User unblocked successfully", user });
});





