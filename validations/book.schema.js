import { z } from "zod";

export const addBookSchema = z.object({
    body: z.object({
        title: z
            .string()
            .min(2, "Title must be at least 2 characters"),
        author: z
            .string()
            .min(2, "Author must be at least 2 characters"),
        category: z
            .string()
            .min(2, "Category must be at least 2 characters"),
        description: z
            .string()
            .min(10, "Description must be at least 10 characters"),
        copies_available: z
            .number()
            .int()
            .positive("Copies available must be a positive integer")
    })
});


