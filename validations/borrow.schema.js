import z from "zod";

export const borrowBookSchema = z.object({
    params: z.object({
        id: z.string()
            .min(1, "Book ID is required")
            .max(24, "Book ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid book ID format"),
    }),
});

export const returnBookSchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "Borrow ID is required")
            .max(24, "Borrow ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid borrow ID format"),
    }),
    body: z.object({
        bookId: z.string()
            .min(1, "Book ID is required")
            .max(24, "Book ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid book ID format"),
    }),
});

export const renewBorrowedBookSchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "Borrow ID is required")
            .max(24, "Borrow ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid borrow ID format"),
    }),
});