import z from "zod";

export const approveBorrowRequestSchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "Borrow ID is required")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid borrow ID format"),
    }),
})

export const rejectBorrowRequestSchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "Borrow ID is required")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid borrow ID format"),
    }),
})

export const getBorrowSchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "Borrow ID is required")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid borrow ID format"),
    }),
});

export const deleteBorrowSchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "Borrow ID is required")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid borrow ID format"),
    }),
});

export const getUserBorrowingHistorySchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "User ID is required")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
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

export const getBorrowsQuerySchema = z.object({
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
            .pipe(
                z.enum(["PENDING", "ACTIVE", "REJECTED", "RETURNED", "CANCELED"]).optional()
            ),

        overdue: z
            .string()
            .optional()
            .transform((val) => val === "true")
    })
});


