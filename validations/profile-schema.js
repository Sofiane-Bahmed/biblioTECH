import { z } from "zod";

export const updateProfileSchema = z.object({
    body: z.object({
        fullName: z
            .string()
            .min(3, "Full name must be at least 3 characters"),
        email: z
            .string()
            .email("Invalid email format"),

    }).partial()
})
