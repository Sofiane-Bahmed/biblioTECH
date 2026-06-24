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
            // Use native Zod transform to safely convert to uppercase if val exists
            .transform((val) => val?.toUpperCase())
            .pipe(
                z.enum(["PENDING", "ACTIVE", "REJECTED", "RETURNED", "CANCELED"]).optional()
            ),

        overdue: z
            .string()
            .optional()
            .transform((val) => val === "true")
    })
});
