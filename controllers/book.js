import { Book } from "../models/book.js"
import { Category } from "../models/category.js";
import { User } from "../models/user.js"
import { BorrowBook } from "../models/borrow.js"
import { sendBookAddedEmail } from "../utils/email-service/sendBookAdded.js";
import { getPaginatedData } from "../utils/paginate.js";
import asyncHandler from "../utils/asyncHandler.js";

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

// read all books : 
export const getAllBooks = asyncHandler(async (req, res) => {

  const result = await getPaginatedData({
    model: Book,
    query: { copies_available: { $gt: 0 } },
    req,
    populate: [
      { path: 'category', select: 'title' },
      { path: 'copies_available' }
    ]
  });

  if (!result.data.length) {
    return res.status(404).json({ message: 'No books found' });
  }

  res.status(200).json(result);
});


export const getBook = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const book = await Book.findById(id);
  res.status(200).json(book);

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

// search books by filtring : 
export const searchBooks = asyncHandler(async (req, res) => {

  const {
    title,
    author,
    category,
    description,
    availableCopies
  } = req.query;

  let filters = {};

  if (title) {
    filters.title = { $regex: title, $options: 'i' };
  }
  if (author) {
    filters.author = { $regex: author, $options: 'i' };
  }
  if (category) {
    const categoryId = await Category.findOne({ title: category });
    if (categoryId) {
      filters.category = categoryId._id;
    } else {
      return res.status(400).json({ message: 'Category not found' });
    }
  }
  if (availableCopies) {
    filters.copies_available = { $gte: availableCopies };
  }
  if (description) {
    filters.description = { $regex: description, $options: 'i' };
  }

  const books = await Book.find(filters).populate('category', 'title');
  res.status(200).json(books);

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