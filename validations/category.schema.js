import { z } from "zod";

export const createBookCategorySchema = z.object({
    body: z.object({
        name: z.string()
            .min(2, "Category name must be at least 2 characters")
            .max(50, "Category name must be at most 50 characters"),
    }),
});