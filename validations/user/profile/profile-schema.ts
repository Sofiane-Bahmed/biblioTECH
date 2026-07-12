import { z } from "zod";

export const updateMyProfileSchema = z.object({
    body: z.object({
        fullName: z
            .string()
            .min(3, "Full name must be at least 3 characters"),
        email: z
            .string()
            .email("Invalid email format"),
    }).partial() // Safely makes fullName and email optional for patch updates
});

export const getMyBorrowsQuerySchema = z.object({
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
            .max(50)
            .default(10),
        status: z
            .string()
            .optional()
            .transform((val) => val?.toUpperCase())
            // Ensure the incoming piped type correctly allows the transformed undefined state
            .pipe(z.enum(["PENDING", "ACTIVE", "REJECTED", "RETURNED", "CANCELED"]).optional()),
        overdue: z
            .string()
            .optional()
            // Transforms string query param "?overdue=true" into a real boolean state
            .transform((val) => val === "true")
    })
});