import { z } from "zod";

// Reusable MongoDB ObjectId validation rule
const objectIdSchema = z
    .string()
    .length(24, "ID must be exactly 24 characters")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/

export const createStaffSchema = z
    .object({
        body: z.object({
            fullName: z
                .string()
                .min(3, { message: "Full name must be at least 3 characters" }),
            email: z
                .string()
                .email({ message: "Invalid email format" }),
            phone: z
                .string({ message: "Phone number is required" })
                .min(10, { message: "Phone number must be at least 10 digits" })
                .regex(phoneRegex, {
                    message: "Invalid phone number format",
                })
                .optional(),
            password: z
                .string()
                .min(8, { message: "Password must be at least 8 characters" }),
            confirmPassword: z
                .string({ message: "Please confirm your password" })
                .min(1, { message: "Please confirm your password" }),
            role: z
                .enum(["librarian", "admin"], {
                    message: "Role must be either 'librarian' or 'admin'",
                })
                .default("librarian"),
        }),
    })
    .refine((data) => data.body.password === data.body.confirmPassword, {
        message: "Passwords do not match",
        path: ["body", "confirmPassword"],
    });

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