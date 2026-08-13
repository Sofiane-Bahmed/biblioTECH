import { Request, Response } from "express";

import asyncHandler from "../../utils/async-handler.js";

import {
  GetBookParams,
  GetBooksQuery,
  SearchBookQuery
} from "../../validations/common/book/book-types.js";
import {
  getBookByIdService,
  getBooksService,
  searchBooksService
} from "../../services/commun/book.js";

export const getBooks = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await getBooksService({ req });

  res.status(result.code).json(result);
});

export const getBook = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const { bookId } = req.params as GetBookParams;

  const result = await getBookByIdService({ bookId });

  res.status(result.code).json(result);
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