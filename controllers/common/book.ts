import { Request, Response } from "express";
import { FilterQuery, Types } from "mongoose";

import { Book, IBook } from "../../models/book.js"
import { Category } from "../../models/category.js";

import { getPaginatedData } from "../../utils/paginate.js";
import asyncHandler from "../../utils/async-handler.js";

import {
  GetBookParams,
  GetBooksQuery,
  SearchBookQuery
} from "../../validations/common/book/book-types.js";

export const getBooks = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {

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
    res.status(404).json({ message: 'No books found' });
    return;
  }

  res.status(200).json(result);
});

export const getBook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { bookId } = req.params as GetBookParams;

  const book = await Book.findById(bookId);
  if (!book) {
    res.status(404).json({ message: "Book not found" });
    return;
  }

  res.status(200).json(book);

});

export const searchBooks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as SearchBookQuery;

  const {
    title,
    author,
    category,
    description,
    copies_available,
    pages,
    language,
    publication_year
  } = query;

  const filters: FilterQuery<IBook> = {};

  if (title) filters.title = { $regex: title, $options: 'i' };
  if (author) filters.author = { $regex: author, $options: 'i' };
  if (description) filters.description = { $regex: description, $options: 'i' };
  if (language) filters.language = { $regex: language, $options: 'i' };

  // Map Relational Category Pointer (Supports Multiple Categories)
  if (category) {
    const categoryTitles = Array.isArray(category) ? category : [category];

    // Find matching categories using a case-insensitive anchors syntax safely
    const foundCategories = await Category.find({
      title: { $in: categoryTitles.map(t => new RegExp(`^${t}$`, "i")) }
    });

    if (foundCategories.length > 0) {
      const categoryIds: Types.ObjectId[] = foundCategories.map(cat => cat._id as Types.ObjectId);
      filters.category = { $all: categoryIds };
    } else {
      // Early return if categories were specified but none matched our database collections
      const currentPage = typeof query.page === "string" ? parseInt(query.page, 10) : 1;
      res.status(200).json({
        success: true,
        count: 0,
        totalPages: 0,
        currentPage: currentPage || 1,
        totalItems: 0,
        data: []
      });
      return;
    }
  }

  // Map Slider/Numeric Floor Metrics
  if (copies_available) filters.copies_available = { $gte: copies_available };
  if (pages) filters.pages = { $lte: pages };
  if (publication_year) filters.publication_year = publication_year;

  const result = await getPaginatedData({
    model: Book,
    query: filters,
    req: req,
    populate: [{ path: 'category', select: 'title' }]
  });

  res.status(200).json(result);
});