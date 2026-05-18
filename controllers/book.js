import { Book } from "../models/book.js"
import { Category } from "../models/category.js";
import { getPaginatedData } from "../utils/paginate.js";
import asyncHandler from "../utils/asyncHandler.js";

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

// search books by filtring : 
export const searchBooks = asyncHandler(async (req, res) => {

  const {
    title,
    author,
    category,
    description,
    available_copies
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
  if (available_copies) {
    filters.copies_available = { $gte: available_copies };
  }
  if (description) {
    filters.description = { $regex: description, $options: 'i' };
  }

  const books = await Book.find(filters).populate('category', 'title');
  res.status(200).json(books);

});
