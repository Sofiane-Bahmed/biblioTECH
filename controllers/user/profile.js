import { User } from "../../models/user.js"
import { BorrowBook } from "../../models/borrow.js"

import { getPaginatedData } from "../../utils/paginate.js";
import asyncHandler from "../../utils/async-handler.js";

export const getMyBorrowingHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await getPaginatedData({
    model: BorrowBook,
    query: {
      user: userId,
      status: { $in: ["ACTIVE", "RETURNED", "REJECTED"] }
    },
    populate: [{ path: "book", select: "title author" }],
    req
  })

  if (!result.data.length) {
    return res.status(200).json({ message: "No borrowing history found", borrows: [] });
  }

  res.status(200).json(result);

});

export const getMyActiveBorrows = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const activeBorrows = await BorrowBook.find({
    user: userId,
    status: "ACTIVE"
  })
    .populate("book", "title author")
    .select("-__v");

  if (!activeBorrows.length) {
    return res.status(200).json({
      message: "No active borrowed books found",
      books: []
    });
  }

  return res.status(200).json({
    message: "Current active borrowed books retrieved successfully",
    books: activeBorrows
  });
});

export const getMyPendingBorrows = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await getPaginatedData({
    model: BorrowBook,
    query: {
      user: userId,
      status: "PENDING"
    },
    populate: [{ path: "book", select: "title author " }],
    req
  })

  if (!result.data.length) {
    return res.status(200).json({
      message: "No pending borrowed books found",
      books: []
    });
  }

  return res.status(200).json(result);
});

export const getMyRejectedBorrows = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const rejectedBorrows = await BorrowBook.find({
    user: userId,
    status: "REJECTED"
  })
    .populate("book", "title author")
    .select("-__v");

  if (!rejectedBorrows.length) {
    return res.status(200).json({
      message: "No rejected borrowed books found",
      books: []
    });
  }

  return res.status(200).json({
    message: "Current rejected borrowed books retrieved successfully",
    books: rejectedBorrows
  });
});

export const getMyReturnedBorrows = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const returnedBorrows = await BorrowBook.find({
    user: userId,
    status: "RETURNED"
  })
    .populate("book", "title author")
    .select("-__v");

  if (!returnedBorrows.length) {
    return res.status(200).json({
      message: "No returned borrowed books found",
      books: []
    });
  }

  return res.status(200).json({
    message: "Current returned borrowed books retrieved successfully",
    books: returnedBorrows
  });
});

export const getMyOverdueBorrows = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const overdueBorrows = await BorrowBook.find({
    user: userId,
    return_date: { $exists: false },
    due_date: { $lt: new Date() }
  })
    .populate("book", "title author")
    .select("-__v");

  if (!overdueBorrows.length) {
    return res.status(200).json({
      message: "No overdue borrowed books found",
      books: []
    });
  }

  return res.status(200).json({
    message: "Current overdue borrowed books retrieved successfully",
    books: overdueBorrows
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




