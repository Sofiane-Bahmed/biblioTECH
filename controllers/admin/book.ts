import { Request, Response } from "express";
import { Types } from "mongoose";

import { Book } from "../../models/book.js"

import asyncHandler from "../../utils/async-handler.js";
import { notifySubscribersAboutNewBook } from "../../services/notification-service.js";
import { fetchBookMetadataByIsbn } from "../../services/googleBooks-service.js";
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
} from "../../validations/admin/book/book-types.js";
import { AuthenticatedRequest } from "../../types/auth.js";

interface BookUpdatePayload extends Omit<UpdateBookBody, "category"> {
  category?: Types.ObjectId[];
  cover_image?: string;
}

export const addBook = asyncHandler(async (
  req: AuthenticatedRequest<any, AddBookBody, any>,
  res: Response
): Promise<void> => {

  const {
    title,
    isbn,
    author,
    category,
    description,
    copies_available,
    pages,
    language,
    publication_year,
  } = req.body;

  if (!req.file) {
    res.status(400).json({ message: "Book cover image is required" });
    return;
  }

  const normalizedIsbn = isbn.replace(/[- ]/g, "").toUpperCase();
  const duplicateBook = await Book.findOne({ isbn: normalizedIsbn });
  if (duplicateBook) {
    res.status(400).json({ message: "A book version with this ISBN already exists in inventory." });
    return;
  }

  const { categoryIds, missingCategories } = await validateExistingCategories(category);
  if (missingCategories.length > 0) {
    res.status(400).json({
      message: "Validation failed: Some specified categories do not exist.",
      missingCategories
    });
    return;
  }

  const authorNames = Array.isArray(author) ? author : [author];
  const coverImageUrl = req.file.path;

  const newBook = await Book.create({
    title,
    isbn: normalizedIsbn,
    author: authorNames,
    category: categoryIds,
    cover_image: coverImageUrl,
    description,
    copies_available,
    pages,
    language,
    publication_year
  });

  res.status(201).json(newBook);

  notifySubscribersAboutNewBook({ title, author: authorNames }).catch(console.error)

});

export const autoAddBookByIsbn = asyncHandler(async (
  req: AuthenticatedRequest<any, AutoImportBookBody, any>,
  res: Response
): Promise<void> => {
  const { isbn } = req.body;

  if (!isbn) {
    res.status(400).json({ message: "ISBN code is required to auto-populate fields." });
    return;
  }

  const normalizedIsbn = isbn.replace(/[- ]/g, "").toUpperCase();

  const duplicateBook = await Book.findOne({ isbn: normalizedIsbn });
  if (duplicateBook) {
    res.status(400).json({ message: "This book version already exists in inventory." });
    return;
  }

  const metadata = await fetchBookMetadataByIsbn(normalizedIsbn);
  if (!metadata) {
    res.status(404).json({ message: "No book records found on Google Books API for this ISBN." });
    return;
  }

  const categoryIds = await getOrCreateCategories(metadata.categories);

  const newBook = await Book.create({
    isbn: normalizedIsbn,
    title: metadata.title,
    author: metadata.authors,
    description: metadata.description,
    pages: metadata.pages,
    language: metadata.language,
    publication_year: metadata.publicationYear,
    cover_image: metadata.coverImageUrl,
    category: categoryIds,
    copies_available: 1,
  });

  res.status(201).json({
    message: "Book auto-discovered and registered successfully!",
    book: newBook
  });

  notifySubscribersAboutNewBook({ title: metadata.title, author: metadata.authors }).catch(console.error);
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

  const { bookId } = req.params ;

  const book = await Book.findByIdAndDelete(bookId);
  if (!book) {
    res.status(404).json({ message: "book not found" });
    return;
  }

  res.status(200).json({ message: "book deleted successfully" });

});
