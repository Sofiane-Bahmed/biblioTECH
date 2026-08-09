import { Request, Response } from "express";

import { Book } from "../../models/book.js"

import { getPaginatedData } from "../../utils/paginate.js";
import asyncHandler from "../../utils/async-handler.js";

import {
  GetBookParams,
  GetBooksQuery,
  SearchBookQuery
} from "../../validations/common/book/book-types.js";
import {
  getBooksService,
  searchBooksService
} from "../../services/communBook-service.js";

export const getBooks = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await getBooksService({ req });

  res.status(result.code).json(result);
});

export const getBook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { bookId } = req.params as GetBookParams;

  const book = await Book.findById(bookId);
  if (!book) {
    res.status(404).json({ message: "Book not found" });
    return;
  }

  res.status(200).json(book);

});

export const searchBooks = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const query = req.query as unknown as SearchBookQuery;

  const result = await searchBooksService({
    query,
    req,
  });

  res.status(result.code).json(result);
});