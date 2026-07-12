import { z } from 'zod';

// Reusable MongoDB ObjectId validation rule
const objectIdSchema = z
    .string()
    .length(24, "Invalid ID length")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

// Reusable pagination query schema
const paginationQuerySchema = z.object({
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
}).optional();

// Reusable text comment schema body
const commentBodySchema = z.object({
    comment: z
        .string()
        .min(1, "Comment cannot be empty")
        .max(500, "Comment cannot exceed 500 characters"),
});

export const commentSchema = z.object({
    params: z.object({
        bookId: objectIdSchema,
    }),
    body: commentBodySchema.extend({
        parentCommentId: objectIdSchema.optional(), // Reusing the rule seamlessly
    }),
});

export const getCommentsSchema = z.object({
    query: paginationQuerySchema,
});

export const getBookCommentsSchema = z.object({
    params: z.object({
        bookId: objectIdSchema,
    }),
    query: paginationQuerySchema,
});

export const getCommentSchema = z.object({
    params: z.object({
        commentId: objectIdSchema,
    }),
});

export const updateCommentSchema = z.object({
    params: z.object({
        commentId: objectIdSchema,
    }),
    body: commentBodySchema,
});

export const deleteCommentSchema = z.object({
    params: z.object({
        commentId: objectIdSchema,
    }),
});