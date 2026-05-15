import { z } from 'zod';

export const commentSchema = z.object({
    body: z.object({
        bookId: z
            .string()
            .min(1, "book ID is required")
            .max(24, "book ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid parent comment ID format"),
        comment: z
            .string()
            .min(1, "Comment cannot be empty")
            .max(500, "Comment cannot exceed 500 characters"),
        parentCommentId: z
            .string()
            .min(1, "parent comment ID must be at least 1 character")
            .max(24, "parent comment ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid parent comment ID format")
            .optional(),
    })

})