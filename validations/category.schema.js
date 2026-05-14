import { z } from "zod";

export const createBookCategorySchema = z.object({
    body: z.object({
        name: z.string()
            .min(2, "Category name must be at least 2 characters")
            .max(50, "Category name must be at most 50 characters"),
    }),
});

export const showBookCategorySchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "category ID is required")
            .max(24, "category ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID format"),
    }),
});

export const updateBookCategorySchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "category ID is required")
            .max(24, "category ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID format"),
    }),
    body: z.object({
        name: z
            .string()
            .min(2, "Category name must be at least 2 characters")
            .max(50, "Category name must be at most 50 characters"),
    }),
});
