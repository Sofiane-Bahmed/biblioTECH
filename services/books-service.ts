import { Book } from "../models/book.js";
import { validateExistingCategories } from "./category-service.js";
import { notifySubscribersAboutNewBook } from "./notification-service.js";

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