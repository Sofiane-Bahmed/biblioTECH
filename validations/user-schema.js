import { z } from "zod";

export const getUserByIdSchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "User ID is required")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
    }),
});

export const getAllUsersSchema = z.object({
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

export const deleteUserSchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "User ID is required")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
    }),
});

export const updateUserSchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "User ID is required")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
    }),
    body: z.object({
        fullName: z
            .string()
            .min(3, "Full name must be at least 3 characters"),
        email: z
            .string()
            .email("Invalid email format"),
        role: z
            .enum(["user", "admin"])
    }).partial()
});
