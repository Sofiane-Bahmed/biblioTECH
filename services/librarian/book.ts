import { Types } from "mongoose";

import { Book } from "../../models/book.js";
import { UpdateBookBody } from "../../validations/librarian/book/book-types.js";
import { getOrCreateCategories, validateExistingCategories } from "../../services/admin/category.js";
import { fetchBookMetadataByIsbn } from "../googleBooks-service.js";
import { notifySubscribersAboutNewBook } from "../notification-service.js";
import { Borrow } from "../../models/borrow.js";

interface BookUpdatePayload extends Omit<UpdateBookBody, "category"> {
    category?: Types.ObjectId[];
    cover_image?: string;
}

export const addBookService = async ({
    title,
    isbn,
    author,
    category,
    description,
    copies_available,
    pages,
    language,
    publication_year,
    coverImageUrl,
}) => {
    // 1. Validate image presence
    if (!coverImageUrl) {
        return {
            status: false,
            code: 400,
            message: "Book cover image is required.",
        };
    }

    // 2. Normalize ISBN and check for duplicate
    const normalizedIsbn = isbn.replace(/[- ]/g, "").toUpperCase();
    const duplicateBook = await Book.findOne({ isbn: normalizedIsbn });

    if (duplicateBook) {
        return {
            status: false,
            code: 400,
            message: "A book version with this ISBN already exists in inventory.",
        };
    }

    // 3. Validate Categories
    const { categoryIds, missingCategories } = await validateExistingCategories(category);
    if (missingCategories.length > 0) {
        return {
            status: false,
            code: 400,
            message: "Validation failed: Some specified categories do not exist.",
            data: { missingCategories },
        };
    }

    const authorNames = Array.isArray(author) ? author : [author];

    // 4. Create new Book record
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
        publication_year,
    });

    // 5. Trigger post-creation async notification
    notifySubscribersAboutNewBook({ title, author: authorNames }).catch(console.error);

    return {
        status: true,
        code: 201,
        message: "Book added to inventory successfully.",
        data: newBook,
    };
};

export const autoAddBookByIsbnService = async ({
    isbn,
    staffId,
}) => {
    // 1. Validate required ISBN input
    if (!isbn) {
        return {
            status: false,
            code: 400,
            message: "ISBN code is required to auto-populate fields.",
        };
    }

    // 2. Normalize ISBN and check for existing record
    const normalizedIsbn = isbn.replace(/[- ]/g, "").toUpperCase();

    const duplicateBook = await Book.findOne({ isbn: normalizedIsbn });
    if (duplicateBook) {
        return {
            status: false,
            code: 400,
            message: "This book version already exists in inventory.",
        };
    }

    // 3. Fetch external metadata (Google Books API)
    const metadata = await fetchBookMetadataByIsbn(normalizedIsbn);
    if (!metadata) {
        return {
            status: false,
            code: 404,
            message: "No book records found on Google Books API for this ISBN.",
        };
    }

    // 4. Resolve or create categories
    const categoryIds = await getOrCreateCategories(metadata.categories);

    // 5. Create new Book entry
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

    // 6. Trigger async notification after creation
    notifySubscribersAboutNewBook({
        title: metadata.title,
        author: metadata.authors,
    }).catch(console.error);

    return {
        status: true,
        code: 201,
        message: "Book auto-discovered and registered successfully!",
        data: newBook,
    };
};

export const updateBookService = async ({
    bookId,
    category,
    coverImageUrl,
    allowedUpdates,
}) => {
    const updateData: BookUpdatePayload = { ...allowedUpdates };

    // 1. Validate categories if provided
    if (category) {
        const { categoryIds, missingCategories } = await validateExistingCategories(category);

        if (missingCategories.length > 0) {
            return {
                status: false,
                code: 400,
                message: "Validation failed: Some specified categories do not exist.",
                data: { missingCategories },
            };
        }
        updateData.category = categoryIds;
    }

    // 2. Attach updated cover image if present
    if (coverImageUrl) {
        updateData.cover_image = coverImageUrl;
    }

    // 3. Atomically update and populate
    const updatedBook = await Book.findByIdAndUpdate(
        bookId,
        { $set: updateData },
        { new: true, runValidators: true }
    ).populate("category");

    if (!updatedBook) {
        return {
            status: false,
            code: 404,
            message: "Book not found.",
        };
    }

    return {
        status: true,
        code: 200,
        message: "Book updated successfully.",
        data: updatedBook,
    };
};

export const deleteBookService = async ({ bookId }) => {
    // 1. Check if book exists
    const book = await Book.findById(bookId);
    if (!book) {
        return {
            status: false,
            code: 404,
            message: "Book not found.",
        };
    }

    // 2. Prevent deletion if active borrow records exist
    const activeBorrows = await Borrow.exists({
        book: bookId,
        status: { $in: ["borrowed", "overdue"] },
    });

    if (activeBorrows) {
        return {
            status: false,
            code: 400,
            message: "Cannot delete book while active borrow records exist.",
        };
    }

    // 3. Delete the book
    await Book.findByIdAndDelete(bookId);

    return {
        status: true,
        code: 200,
        message: "Book deleted successfully.",
    };
};
