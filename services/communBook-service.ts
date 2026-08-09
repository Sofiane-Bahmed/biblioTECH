import { FilterQuery, Types } from "mongoose";

import { Book, IBook } from "../models/book.js";
import { Category } from "../models/category.js";
import { getPaginatedData } from "../utils/paginate.js";

const escapeRegex = (text: string) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

export const searchBooksService = async ({ query, req }) => {
    const {
        title,
        author,
        category,
        description,
        copies_available,
        pages,
        language,
        publication_year,
    } = query;

    const filters: FilterQuery<IBook> = {};

    if (title) filters.title = { $regex: escapeRegex(String(title)), $options: "i" };
    if (author) filters.author = { $regex: escapeRegex(String(author)), $options: "i" };
    if (description) filters.description = { $regex: escapeRegex(String(description)), $options: "i" };
    if (language) filters.language = { $regex: escapeRegex(String(language)), $options: "i" };

    // Map Relational Category Pointer (Supports Multiple Categories)
    if (category) {
        const categoryTitles = Array.isArray(category) ? category : [category];

        const foundCategories = await Category.find({
            title: {
                $in: categoryTitles.map((t) => new RegExp(`^${escapeRegex(String(t))}$`, "i")),
            },
        });

        if (foundCategories.length > 0) {
            const categoryIds: Types.ObjectId[] = foundCategories.map(
                (cat) => cat._id as Types.ObjectId
            );
            filters.category = { $all: categoryIds };
        } else {
            // Early exit if category filter specified non-existent entities
            const page =
                typeof query.page === "number"
                    ? query.page
                    : typeof query.page === "string"
                        ? parseInt(query.page, 10)
                        : 1;

            return {
                status: true,
                code: 200,
                message: "No books found matching the selected categories.",
                data: {
                    success: true,
                    count: 0,
                    totalPages: 0,
                    currentPage: page || 1,
                    totalItems: 0,
                    data: [],
                },
            };
        }
    }

    // Map Numeric Floor/Ceiling Filters
    if (copies_available !== undefined) {
        filters.copies_available = { $gte: Number(copies_available) };
    }
    if (pages !== undefined) {
        filters.pages = { $lte: Number(pages) };
    }
    if (publication_year !== undefined) {
        filters.publication_year = Number(publication_year);
    }

    const result = await getPaginatedData({
        model: Book,
        query: filters,
        req,
        populate: [{ path: "category", select: "title" }],
    });

    return {
        status: true,
        code: 200,
        message: result.data.length
            ? "Books retrieved successfully."
            : "No books found matching your query criteria.",
        data: result,
    };
};

export const getBooksService = async ({ req }) => {
    const result = await getPaginatedData({
        model: Book,
        query: { copies_available: { $gt: 0 } },
        req,
        populate: [
            { path: "category", select: "title" }
        ],
    });

    if (!result || !result.data || !result.data.length) {
        return {
            status: true,
            code: 200,
            message: "No available books found.",
            data: {
                ...result,
                data: [],
            },
        };
    }

    return {
        status: true,
        code: 200,
        message: "Books retrieved successfully.",
        data: result,
    };
};

export const getBookByIdService = async ({ bookId }) => {
    const book = await Book.findById(bookId).populate({
        path: "category",
        select: "title",
    });

    if (!book) {
        return {
            status: false,
            code: 404,
            message: "Book not found.",
        };
    }

    return {
        status: true,
        code: 200,
        message: "Book details retrieved successfully.",
        data: { book },
    };
};