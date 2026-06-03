import axios from "axios";

import { Book } from "../../models/book.js"
import { Category } from "../../models/category.js";
import { User } from "../../models/user.js"
import { BorrowBook } from "../../models/borrow.js"
import { sendBookAddedEmail } from "../../utils/email-service/book-added.js";
import asyncHandler from "../../utils/async-handler.js";

// add books 
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

  // Check if categories exist
  const categoryTitles = Array.isArray(category) ? category : [category];
  const foundCategories = await Category.find({ title: { $in: categoryTitles } });
  //strict validation check: Do the database results match the user's intent?
  if (foundCategories.length !== categoryTitles.length) {
    // find exactly which titles are missing by comparing arrays
    const foundTitles = foundCategories.map(cat => cat.title);
    const missingCategories = categoryTitles.filter(title => !foundTitles.includes(title));

    return res.status(400).json({
      message: "Validation failed: Some specified categories do not exist.",
      missingCategories
    });
  };

  // Strip hyphens and spaces to normalize string integrity
  const normalizedIsbn = isbn.replace(/[- ]/g, "").toUpperCase();
  // Check if a book with this exact ISBN already exists before proceeding
  const duplicateBook = await Book.findOne({ isbn: normalizedIsbn });
  if (duplicateBook) {
    return res.status(400).json({ message: "A book version with this ISBN already exists in inventory." });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Book cover image is required" });
  }

  const authorNames = Array.isArray(req.body.author) ? req.body.author : [req.body.author];
  const categoryIds = foundCategories.map(cat => cat._id);
  const coverImageUrl = req.file.path;

  const newBook = await Book.create({
    title,
    isbn: normalizedIsbn,
    author: authorNames,
    description,
    copies_available,
    pages,
    language,
    publication_year,
    category: categoryIds,
    cover_image: coverImageUrl
  });

  // Send email notification to subscribers
  const subscribers = await User.find({ subscribed: true });

  for (const subscriber of subscribers) {
    await sendBookAddedEmail(subscriber, { title, author: authorNames });
  }

  res.status(201).json(newBook);

});

export const autoAddBookByIsbn = asyncHandler(async (req, res) => {
  const { isbn } = req.body;

  if (!isbn) {
    return res.status(400).json({ message: "ISBN code is required to auto-populate fields." });
  }

  const normalizedIsbn = isbn.replace(/[- ]/g, "").toUpperCase();

  // Prevent database duplicate records
  const duplicateBook = await Book.findOne({ isbn: normalizedIsbn });
  if (duplicateBook) {
    return res.status(400).json({ message: "This book version already exists in inventory." });
  }

  // Query the Google Books API
  console.log(`Fetching metadata for ISBN: ${normalizedIsbn}...`);
  const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${normalizedIsbn}`;
  const response = await axios.get(googleBooksUrl);

  // Verify that Google actually found a matching book record
  if (!response.data.items || response.data.items.length === 0) {
    return res.status(404).json({ message: "No book records found on Google Books API for this ISBN." });
  }

  // Extract the core volume details out of the payload array
  const volumeInfo = response.data.items[0].volumeInfo;

  //Extract and Fallback clean properties matching your schema expectations
  const title = volumeInfo.title || "Untitled Book";
  const authorNames = volumeInfo.authors || ["Unknown Author"]; // Google returns an array of authors natively
  const description = volumeInfo.description || "No description provided.";
  const pages = volumeInfo.pageCount || 0;
  const language = volumeInfo.language || "en";
  const publication_year = volumeInfo.publishedDate ? parseInt(volumeInfo.publishedDate.split("-")[0]) : new Date().getFullYear();

  // Google returns an object containing multiple image size variants
  const coverImageUrl = volumeInfo.imageLinks?.thumbnail || "https://placehold.co/400x600?text=No+Cover+Available";

  // Dynamic Category Matching (Maps Google categories to your real DB collections)
  const googleCategories = volumeInfo.categories || ["General"];
  const categoryIds = [];

  for (const catTitle of googleCategories) {
    // Look for an exact match case-insensitively, or auto-create it so the cast doesn't crash!
    let matchedCategory = await Category.findOne({ title: new RegExp(`^${catTitle}$`, "i") });

    if (!matchedCategory) {
      // If the category doesn't exist in your DB yet, dynamically spin it up on the fly
      matchedCategory = await Category.create({ title: catTitle.toLowerCase() });
    }
    categoryIds.push(matchedCategory._id);
  }

  const newBook = await Book.create({
    title,
    isbn: normalizedIsbn,
    author: authorNames,
    description,
    copies_available: 1, // Defaulting to one copy on initialization scan
    pages,
    language,
    publication_year,
    category: categoryIds,
    cover_image: coverImageUrl // Saves the persistent hosting link provided by Google CDN
  });

  // Send notification logs out to active community subscribers
  const subscribers = await User.find({ subscribed: true });
  for (const subscriber of subscribers) {
    await sendBookAddedEmail(subscriber, { title, author: authorNames });
  }

  res.status(201).json({
    message: "Book auto-discovered and registered successfully!",
    book: newBook
  });
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
