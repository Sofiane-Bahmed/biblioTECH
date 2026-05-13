import { z } from "zod";

export const addBookSchema = z.object({
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
            .string()
            .min(2, "Category must be at least 2 characters")
            .max(50, "Category must be at most 50 characters"),
        description: z
            .string()
            .min(10, "Description must be at least 10 characters")
            .max(500, "Description must be at most 500 characters"),
        copies_available: z
            .number()
            .int()
            .positive("Copies available must be a positive integer")
    })
});

export const updateBookSchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "User ID is required")
            .max(24, "User ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
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
            .string()
            .min(2, "Category must be at least 2 characters")
            .max(50, "Category must be at most 50 characters"),
        description: z
            .string()
            .min(10, "Description must be at least 10 characters")
            .max(500, "Description must be at most 500 characters"),
        copies_available: z
            .number()
            .int()
            .positive("Copies available must be a positive integer")
    }).partial()
});


