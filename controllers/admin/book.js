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
    author,
    category,
    description,
    copies_available,
  } = req.body;

  // Check if category exists
  const existingCategory = await Category.findOne({ title: category });
  if (!existingCategory) {
    return res.status(400).json({ message: 'Category does not exist' });
  }

  // Create new book
  const newBook = await Book.create({
    title,
    author,
    description,
    copies_available,
    category: existingCategory._id
  });

  // Send email notification to subscribers
  const subscribers = await User.find({ subscribed: true });

  for (const subscriber of subscribers) {
    await sendBookAddedEmail(subscriber, { title, author });
  }

  res.status(201).json(newBook);

});


// update a book 
export const updateBook = asyncHandler(async (req, res) => {

  const { id } = req.params;
  const {
    title,
    author,
    description,
    copies_available,
    category
  } = req.body;

  const book = await Book.findById(id);
  if (!book) {
    return res.status(404).json({ message: "book not found" })
  }
  // Check if category exists
  const existingCategory = await Category.findOne({ title: category });
  if (!existingCategory) {
    return res.status(400).json({ message: 'Category does not exist' });
  }

  const updatedBook = await Book.findByIdAndUpdate(
    id
    , {
      title,
      author,
      description,
      copies_available,
      category: existingCategory._id
    },
    {
      new: true,
      runValidators: true
    }
  )

  res.status(200).json({ message: "book updated successfully", updatedBook })

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

// view libary statistics
export const getLibraryStatistics = asyncHandler(async (req, res) => {

  const borrows = await BorrowBook.find();
  const books = await Book.find();

  const borrowCount = borrows.length;
  const bookCount = books.length;

  let mostBorrowedBook = { id: null, count: 0 };
  const bookCounts = {};

  for (const borrow of borrows) {
    const bookId = borrow.book;
    if (bookId in bookCounts) {
      bookCounts[bookId]++;
    } else {
      bookCounts[bookId] = 1;
    }

    if (bookCounts[bookId] > mostBorrowedBook.count) {
      mostBorrowedBook = { id: bookId, count: bookCounts[bookId] };
    }
  }

  const statistics = {
    borrowCount,
    bookCount,
    mostBorrowedBook,
    bookCounts
  };

  res.status(200).json(statistics);

}); 