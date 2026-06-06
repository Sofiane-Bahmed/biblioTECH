import { BorrowBook } from "../../models/borrow.js";

import { getPaginatedData } from "../../utils/paginate.js";
import asyncHandler from "../../utils/async-handler.js";

// Get all borrows 
export const getAllBorrows = asyncHandler(async (req, res) => {

  const result = await getPaginatedData({
    model: BorrowBook,
    req,
    populate: [
      { path: 'user', select: 'fullName email' },
      { path: 'book', select: 'title author' }
    ],
  });

  if (!result.data.length) {
    return res.status(200).json({ message: "No borrowing history found", data: [] });
  }

  res.status(200).json(result);

});

export const getBorrowById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const borrow = await BorrowBook
    .findById(id)
    .populate('user', 'fullName email')
    .populate('book', 'title author');

  if (!borrow) {
    return res.status(404).json({ message: "Borrow record not found" });
  }
  res.status(200).json({ data: borrow });
});

export const getActiveBorrows = asyncHandler(async (req, res) => {

  const result = await getPaginatedData({
    model: BorrowBook,
    req,
    populate: [
      { path: 'user', select: 'fullName email' },
      { path: 'book', select: 'title author' }
    ],
    query: { return_date: { $exists: false } }
  })

  if (!result.data.length) {
    return res.status(200).json({ message: "No active borrows found", data: [] });
  }
  res.status(200).json(result);

});

export const getOverdueBorrows = asyncHandler(async (req, res) => {

  const overdueBorrows = await BorrowBook
    .find({
      return_date: { $exists: false },
      due_date: { $lt: new Date() }
    })
    .populate('user', 'fullName email')
    .populate('book', 'title author');

  if (!overdueBorrows || !overdueBorrows.length) {
    return res.status(200).json({ message: "No overdue borrows found", data: [] });
  }
  res.status(200).json({ data: overdueBorrows });

});

export const deleteBorrowById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const borrow = await BorrowBook.findByIdAndDelete(id);
  if (!borrow) {
    return res.status(404).json({ message: "Borrow record not found" });
  }
  res.status(200).json({ message: "Borrow record deleted successfully" });
});

