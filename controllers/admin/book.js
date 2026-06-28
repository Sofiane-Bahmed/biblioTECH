import axios from "axios";

import { Book } from "../../models/book.js"
import { Category } from "../../models/category.js";
import { User } from "../../models/user.js"
import { BorrowBook } from "../../models/borrow.js"
import asyncHandler from "../../utils/async-handler.js";
import { notifySubscribersAboutNewBook } from "../../services/notification-service.js";
import { fetchBookMetadataByIsbn } from "../../services/googleBooks-service.js";
import {
  getOrCreateCategories,
  validateExistingCategories
} from "../../services/category-service.js";

export const addBook = asyncHandler(async (req, res) => {

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
    cover_image
  } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "Book cover image is required" });
  }

  const normalizedIsbn = isbn.replace(/[- ]/g, "").toUpperCase();
  const duplicateBook = await Book.findOne({ isbn: normalizedIsbn });
  if (duplicateBook) {
    return res.status(400).json({ message: "A book version with this ISBN already exists in inventory." });
  }

  const { categoryIds, missingCategories } = await validateExistingCategories(category);
  if (missingCategories.length > 0) {
    return res.status(400).json({
      message: "Validation failed: Some specified categories do not exist.",
      missingCategories
    });
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

export const autoAddBookByIsbn = asyncHandler(async (req, res) => {
  const { isbn } = req.body;

  if (!isbn) {
    return res.status(400).json({ message: "ISBN code is required to auto-populate fields." });
  }

  const normalizedIsbn = isbn.replace(/[- ]/g, "").toUpperCase();

  const duplicateBook = await Book.findOne({ isbn: normalizedIsbn });
  if (duplicateBook) {
    return res.status(400).json({ message: "This book version already exists in inventory." });
  }

  const metadata = await fetchBookMetadataByIsbn(normalizedIsbn);
  if (!metadata) {
    return res.status(404).json({ message: "No book records found on Google Books API for this ISBN." });
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

export const updateBook = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  const { category, ...allowedUpdates } = req.body;

  const updateData = { ...allowedUpdates };

  if (category) {
    const { categoryIds, missingCategories } = await validateExistingCategories(category);

    if (missingCategories.length > 0) {
      return res.status(400).json({
        message: "Validation failed: Some specified categories do not exist.",
        missingCategories
      });
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
    return res.status(404).json({ message: "Book not found" });
  }

  res.status(200).json({
    message: "Book updated successfully",
    updatedBook
  });
});

export const deleteBook = asyncHandler(async (req, res) => {

  const { bookId } = req.params;

  const book = await Book.findByIdAndDelete(bookId);
  if (!book) {
    return res.status(404).json({ message: "book not found" })
  }

  res.status(200).json({ message: "book deleted successfully" })

});
