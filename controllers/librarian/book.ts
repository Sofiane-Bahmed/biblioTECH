import { Response } from "express";

import { Book } from "../../models/book.js"
import asyncHandler from "../../utils/async-handler.js";
import {
  addBookService,
  autoAddBookByIsbnService,
  updateBookService
} from "../../services/books-service.js";
import {
  AddBookBody,
  AutoImportBookBody,
  DeleteBookParams,
  UpdateBookBody,
  UpdateBookParams
} from "../../validations/librarian/book/book-types.js";
import { AuthenticatedRequest } from "../../types/auth.js";


export const addBook = asyncHandler(async (
  req: AuthenticatedRequest<any, AddBookBody, any>,
  res: Response
): Promise<void> => {
  const staffId = req.user!._id;
  const coverImageUrl = req.file?.path;

  const result = await addBookService({
    ...req.body,
    coverImageUrl,
    staffId,
  });

  res.status(result.code).json(result);
});

export const autoAddBookByIsbn = asyncHandler(async (
  req: AuthenticatedRequest<any, AutoImportBookBody, any>,
  res: Response
): Promise<void> => {
  const { isbn } = req.body;
  const staffId = req.user!._id;

  const result = await autoAddBookByIsbnService({
    isbn,
    staffId,
  });

  res.status(result.code).json(result);
});

export const updateBook = asyncHandler(async (
  req: AuthenticatedRequest<UpdateBookParams, UpdateBookBody, any>,
  res: Response
): Promise<void> => {
  const { bookId } = req.params;
  const { category, ...allowedUpdates } = req.body;
  const coverImageUrl = req.file?.path;

  const result = await updateBookService({
    bookId,
    category,
    coverImageUrl,
    allowedUpdates,
  });

  res.status(result.code).json(result);
});

export const deleteBook = asyncHandler(async (
  req: AuthenticatedRequest<DeleteBookParams, any, any>,
  res: Response
): Promise<void> => {

  const { bookId } = req.params;

  const book = await Book.findByIdAndDelete(bookId);
  if (!book) {
    res.status(404).json({ message: "book not found" });
    return;
  }

  res.status(200).json({ message: "book deleted successfully" });

});
