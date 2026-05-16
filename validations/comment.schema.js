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

});

export const getAllCommentsSchema = z.object({
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
})

export const getCommentsByBookSchema = z.object({
    params: z.object({
        id: z.string()
            .min(1, "Book ID is required")
            .max(24, "Book ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid book ID format"),
    }),
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

export const getCommentsByIdSchema = z.object({
    params: z.object({
        id: z.string()
            .min(1, "Comment ID is required")
            .max(24, "Comment ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid comment ID format"),
    }),
});

export const updateCommentSchema = z.object({
    params: z.object({
        id: z.string()
            .min(1, "Comment ID is required")
            .max(24, "Comment ID must be 24 characters")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid comment ID format"),
    }),
    body: z.object({
        commentUpdate: z
            .string()
            .min(1, "CommentUpdate cannot be empty")
            .max(500, "CommentUpdate cannot exceed 500 characters"),
    })
});
