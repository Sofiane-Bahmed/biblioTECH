import { z } from "zod";

// Helper function to safely force form inputs into arrays
const preprocessArray = (val) => {
    if (val === undefined || val === null) return [];
    return Array.isArray(val) ? val : [val];
};

const isbnRegex = /^(?:ISBN(?:-1[03])?:?\s*)?(?=[0-9X]{10}$|(?=(?:[0-9]{1,5}-){3})[0-9X]{13}$|[0-9]{13}$|(?=(?:[0-9]{1,5}-){4})[0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/;

export const addBookSchema = z.object({
    body: z.object({
        title: z
            .string()
            .min(2, "Title must be at least 2 characters")
            .max(100, "Title must be at most 100 characters"),
        isbn: z
            .string()
            .trim()
            .regex(isbnRegex, { message: "Invalid ISBN-10 or ISBN-13 format format required." }),
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

export const autoImportBookSchema = z.object({
    body: z.object({
        isbn: z
            .string({ required_error: "ISBN code is required to auto-populate fields." })
            .trim()
            .regex(isbnRegex, { message: "Invalid ISBN format. Please enter a valid ISBN-10 or ISBN-13 string." }),
    }),
});

export const getBooksSchema = z.object({
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
        bookId: z
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
        isbn: z
            .string()
            .trim()
            .regex(isbnRegex, { message: "Invalid ISBN-10 or ISBN-13 format format required." }),
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
    }).partial()
});

export const deleteBookSchema = z.object({
    params: z.object({
        bookId: z
            .string()
            .min(1, "Book ID is required")
            .max(24, "Book ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid book ID format"),
    }),
});

export const getBookSchema = z.object({
    params: z.object({
        bookId: z
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
            .max(100, "Title must be at most 100 characters"),
        author: z
            .string()
            .max(50, "Author must be at most 50 characters"),
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
            .positive("Publication year must be a positive integer"),
        page: z
            .coerce
            .number()
            .int()
            .positive()
            .default(1),
        limit: z
            .coerce
            .number()
            .int()
            .positive()
            .default(10)
    }).partial()
});


