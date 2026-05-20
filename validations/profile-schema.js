import { z } from "zod";

export const updateProfileSchema = z.object({
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

    }).partial()
})
