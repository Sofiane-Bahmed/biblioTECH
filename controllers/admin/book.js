import axios from "axios";

import { Book } from "../../models/book.js"
import { Category } from "../../models/category.js";
import { User } from "../../models/user.js"
import { BorrowBook } from "../../models/borrow.js"
import { sendBookAddedEmail } from "../../utils/email-service/book-added.js";
import asyncHandler from "../../utils/async-handler.js";
import { notifySubscribersAboutNewBook } from "../../services/notification-service.js";
import { fetchBookMetadataByIsbn } from "../../services/googleBooks-service.js";
import { getOrCreateCategories } from "../../services/category-service.js";

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

  // Normalize & Verify Duplication
  const normalizedIsbn = isbn.replace(/[- ]/g, "").toUpperCase();
  const duplicateBook = await Book.findOne({ isbn: normalizedIsbn });
  if (duplicateBook) {
    return res.status(400).json({ message: "A book version with this ISBN already exists in inventory." });
  }

  // Validate and Map Categories
  const categoryTitles = Array.isArray(category) ? category : [category];
  const foundCategories = await Category.find({ title: { $in: categoryTitles } });
  if (foundCategories.length !== categoryTitles.length) {
    const foundTitles = foundCategories.map(cat => cat.title);
    const missingCategories = categoryTitles.filter(title => !foundTitles.includes(title));

    return res.status(400).json({
      message: "Validation failed: Some specified categories do not exist.",
      missingCategories
    });
  };

  // Persist Data
  const authorNames = Array.isArray(author) ? author : [author];
  const categoryIds = foundCategories.map(cat => cat._id);
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

  // Uniqueness Guard
  const duplicateBook = await Book.findOne({ isbn: normalizedIsbn });
  if (duplicateBook) {
    return res.status(400).json({ message: "This book version already exists in inventory." });
  }

  // Fetch Metadata from External Service
  const metadata = await fetchBookMetadataByIsbn(normalizedIsbn);
  if (!metadata) {
    return res.status(404).json({ message: "No book records found on Google Books API for this ISBN." });
  }

  const categoryIds = await getOrCreateCategories(metadata.categories);

  // Persist to Database
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


// update a book
export const updateBook = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify the book exists first
  const book = await Book.findById(id);
  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  // Dynamically gather text fields that were actually sent
  const updateData = { ...req.body };

  //Handle Category update safely if provided
  if (req.body.category) {
    const categoryTitles = Array.isArray(req.body.category)
      ? req.body.category
      : [req.body.category];

    const foundCategories = await Category.find({ title: { $in: categoryTitles } });
    if (foundCategories.length !== categoryTitles.length) {
      // find exactly which titles are missing by comparing arrays
      const foundTitles = foundCategories.map(cat => cat.title);
      const missingCategories = categoryTitles.filter(title => !foundTitles.includes(title));

      return res.status(400).json({
        message: "Validation failed: Some specified categories do not exist.",
        missingCategories
      });
    }

    const categoryIds = foundCategories.map(cat => cat._id);
    updateData.category = categoryIds;
  }

  // Handle File upload context safely
  if (req.file) {
    updateData.cover_image = req.file.path;
  }

  const updatedBook = await Book.findByIdAndUpdate(
    id,
    { $set: updateData },
    {
      new: true,
      runValidators: true
    }
  ).populate("category");

  res.status(200).json({
    message: "Book updated successfully",
    updatedBook
  });
});

// delete a book 
export const deleteBook = asyncHandler(async (req, res) => {

  const { id } = req.params;

  const book = await Book.findByIdAndDelete(id);
  if (!book) {
    return res.status(404).json({ message: "book not found" })
  }

  res.status(200).json({ message: "book deleted successfully" })

});
