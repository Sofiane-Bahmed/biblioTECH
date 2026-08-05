import { Response } from "express";
import { Types } from "mongoose";

import { Book } from "../../models/book.js"

import asyncHandler from "../../utils/async-handler.js";
import { notifySubscribersAboutNewBook } from "../../services/notification-service.js";
import { fetchBookMetadataByIsbn } from "../../services/googleBooks-service.js";
import { addBookService, autoAddBookByIsbnService } from "../../services/books-service.js";
import {
  getOrCreateCategories,
  validateExistingCategories
} from "../../services/category-service.js";

import {
  AddBookBody,
  AutoImportBookBody,
  DeleteBookParams,
  UpdateBookBody,
  UpdateBookParams
} from "../../validations/librarian/book/book-types.js";
import { AuthenticatedRequest } from "../../types/auth.js";

interface BookUpdatePayload extends Omit<UpdateBookBody, "category"> {
  category?: Types.ObjectId[];
  cover_image?: string;
}

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

  const updateData: BookUpdatePayload = { ...allowedUpdates };

  if (category) {
    const { categoryIds, missingCategories } = await validateExistingCategories(category);

    if (missingCategories.length > 0) {
      res.status(400).json({
        message: "Validation failed: Some specified categories do not exist.",
        missingCategories
      });
      return;
    }
    updateData.category = categoryIds;
  }

  if (req.file) {
    updateData.cover_image = req.file.path;
  }

  const updatedBook = await Book.findByIdAndUpdate(
    bookId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate("category");

  if (!updatedBook) {
    res.status(404).json({ message: "Book not found" });
    return;
  }

  res.status(200).json({
    message: "Book updated successfully",
    updatedBook
  });
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
