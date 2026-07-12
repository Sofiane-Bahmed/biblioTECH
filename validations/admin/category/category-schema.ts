import { z } from "zod";

// Reusable MongoDB ObjectId validation rule
const objectIdSchema = z
    .string()
    .length(24, "ID must be exactly 24 characters")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

// Shared core category fields
const categoryCoreBody = z.object({
    title: z
        .string()
        .min(2, "Category title must be at least 2 characters")
        .max(50, "Category title must be at most 50 characters"),
    description: z
        .string()
        .min(10, "Category description must be at least 10 characters")
        .max(500, "Category description must be at most 500 characters"),
});

// --- Schema Definitions ---

export const addCategorySchema = z.object({
    body: categoryCoreBody,
});

export const getCategoriesSchema = z.object({
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
            .max(50)
            .default(10),
    })
});

export const getCategorySchema = z.object({
    params: z.object({
        categoryId: objectIdSchema,
    }),
});

export const updateCategorySchema = z.object({
    params: z.object({
        categoryId: objectIdSchema,
    }),
    body: categoryCoreBody.partial(),
});

export const deleteCategorySchema = z.object({
    params: z.object({
        categoryId: objectIdSchema,
    }),
});