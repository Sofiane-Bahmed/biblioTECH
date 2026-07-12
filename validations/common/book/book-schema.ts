import z from "zod";

// Helper function to safely force query items/form inputs into arrays
const preprocessArray = (val: unknown): unknown[] => {
    if (val === undefined || val === null) return [];
    return Array.isArray(val) ? val : [val];
};

export const getBooksSchema = z.object({
    query: z.object({
        page: z
            .coerce
            .number()
            .int()
            .min(1)
            .default(1),
        limit: z
            .coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .default(10),
    })
});

export const getBookSchema = z.object({
    params: z.object({
        bookId: z
            .string()
            .min(1, "Book ID is required")
            .length(24, "Book ID must be exactly 24 characters")
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
            .refine((arr) => !arr || arr.length > 0, { message: "At least one category is required" }),
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