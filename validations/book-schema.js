import { z } from "zod";

// Helper function to safely force form inputs into arrays
const preprocessArray = (val) => {
    if (val === undefined || val === null) return [];
    return Array.isArray(val) ? val : [val];
};

export const addBookSchema = z.object({
    body: z.object({
        title: z
            .string()
            .min(2, "Title must be at least 2 characters")
            .max(100, "Title must be at most 100 characters"),
        author: z
            .preprocess(preprocessArray, z.array(z.string().min(2, "Author name is too short")))
            .refine((arr) => arr.length > 0, { message: "At least one author is required" }),
        category: z
            .preprocess(preprocessArray, z.array(z.string().min(2, "Category name is too short")))
            .refine((arr) => arr.length > 0, { message: "At least one category is required" }),
        description: z
            .string()
            .min(10, "Description must be at least 10 characters")
            .max(500, "Description must be at most 500 characters"),
        copies_available: z
            .coerce
            .number()
            .int()
            .positive("Copies available must be a positive integer"),
        pages: z
            .coerce
            .number()
            .int()
            .positive("Pages must be a positive integer"),
        language: z
            .string()
            .min(2, "Language must be at least 2 characters")
            .max(50, "Language must be at most 50 characters"),
        publication_year: z
            .coerce
            .number()
            .int()
            .positive("Publication year must be a positive integer"),
    })
});

export const getAllBooksSchema = z.object({
    query: z.object({
        page: z
            .coerce
            .number()
            .int()
            .min(1).
            default(1),
        limit: z
            .coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .default(10),
    }).optional()
});

export const updateBookSchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "Book ID is required")
            .max(24, "Book ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid book ID format"),
    }),
    body: z.object({
        title: z
            .string()
            .min(2, "Title must be at least 2 characters")
            .max(100, "Title must be at most 100 characters"),
        author: z
            .string()
            .min(2, "Author must be at least 2 characters")
            .max(50, "Author must be at most 50 characters"),
        category: z
            .array(z.string().min(2, "Category name is too short"))
            .min(1, "At least one category is required"),
        description: z
            .string()
            .min(10, "Description must be at least 10 characters")
            .max(500, "Description must be at most 500 characters"),
        copies_available: z
            .coerce
            .number()
            .int()
            .positive("Copies available must be a positive integer"),
        pages: z
            .coerce
            .number()
            .int()
            .positive("Pages must be a positive integer"),
        language: z
            .string()
            .min(2, "Language must be at least 2 characters")
            .max(50, "Language must be at most 50 characters"),
        publication_year: z
            .coerce
            .number()
            .int()
            .positive("Publication year must be a positive integer"),
    }).partial()
});

export const deleteBookSchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "Book ID is required")
            .max(24, "Book ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid book ID format"),
    }),
});

export const getBookSchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "Book ID is required")
            .max(24, "Book ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid book ID format"),
    }),
});

export const searchBookSchema = z.object({
    query: z.object({
        title: z
            .string()
            .min(1, "Title must be at least 1 character")
            .max(100, "Title must be at most 100 characters"),
        author: z
            .string()
            .min(2, "Author must be at least 2 characters")
            .max(50, "Author must be at most 50 characters"),
        category: z
            .string()
            .min(2, "Category must be at least 2 characters")
            .max(50, "Category must be at most 50 characters"),
        description: z
            .string()
            .min(10, "Description must be at least 10 characters")
            .max(500, "Description must be at most 500 characters"),
        copies_available: z
            .coerce
            .number()
            .int()
            .nonnegative("Copies available cannot be negative"),
        pages: z
            .coerce
            .number()
            .int()
            .nonnegative("Pages cannot be negative"),
        language: z
            .string()
            .min(2, "Language must be at least 2 characters")
            .max(50, "Language must be at most 50 characters"),
        publication_year: z
            .coerce
            .number()
            .int()
            .positive("Publication year must be a positive integer")
    }).partial()
});


