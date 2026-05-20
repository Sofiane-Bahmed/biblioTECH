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
