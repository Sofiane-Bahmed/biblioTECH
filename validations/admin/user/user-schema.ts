import { z } from "zod";

// Reusable MongoDB ObjectId validation rule
const objectIdSchema = z
    .string()
    .length(24, "ID must be exactly 24 characters")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");


export const getUserSchema = z.object({
    params: z.object({
        userId: objectIdSchema,
    }),
});

export const getUsersSchema = z.object({
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
    }).optional()
});

export const deleteUserSchema = z.object({
    params: z.object({
        userId: objectIdSchema,
    }),
});

export const updateUserRoleSchema = z.object({
    params: z.object({
        id: objectIdSchema, 
    }),
    body: z.object({
        role: z.enum(["user", "admin"])
    }).partial()
});

export const blockUserSchema = z.object({
    params: z.object({
        userId: objectIdSchema,
    }),
});

export const unblockUserSchema = z.object({
    params: z.object({
        userId: objectIdSchema,
    }),
});