import { Book } from "../models/book.js"
import { Category } from "../models/category.js";
import { getPaginatedData } from "../utils/paginate.js";
import asyncHandler from "../utils/async-handler.js";

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

// search books
export const searchBooks = asyncHandler(async (req, res) => {
  const {
    title,
    author,
    category,
    description,
    available_copies,
    pages,
    language,
    publication_year
  } = req.query;

  const filters = {};

  // Map Text Filter Query Strings
  if (title) filters.title = { $regex: title, $options: 'i' };
  if (author) filters.author = { $regex: author, $options: 'i' };
  if (description) filters.description = { $regex: description, $options: 'i' };
  if (language) filters.language = { $regex: language, $options: 'i' };

  // Map Relational Category Pointer (Supports Multiple Categories)
  if (category) {
    const categoryTitles = Array.isArray(category) ? category : [category];
    const foundCategories = await Category.find({
      title: { $in: categoryTitles.map(title => new RegExp(`^${title}$`, 'i')) }
    });

    if (foundCategories.length > 0) {
      const categoryIds = foundCategories.map(cat => cat._id);
      filters.category = { $all: categoryIds };
    } else {
      return res.status(200).json({
        success: true,
        count: 0,
        totalPages: 0,
        currentPage: parseInt(req.query.page, 10) || 1,
        totalItems: 0,
        data: []
      });
    }
  }

  // Map Slider/Numeric Floor Metrics
  if (available_copies) filters.copies_available = { $gte: parseInt(available_copies, 10) };
  if (pages) filters.pages = { $lte: parseInt(pages, 10) };
  if (publication_year) filters.publication_year = parseInt(publication_year, 10);

  const result = await getPaginatedData({
    model: Book,
    query: filters,
    req: req,
    populate: [{ path: 'category', select: 'title' }]
  });

  res.status(200).json(result);
});