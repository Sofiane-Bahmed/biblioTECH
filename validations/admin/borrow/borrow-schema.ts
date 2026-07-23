import { z } from "zod";

// Reusable MongoDB ObjectId validation rule
const objectIdSchema = z
    .string()
    .length(24, "ID must be exactly 24 characters")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

// Reusable administrative pagination parameters
const adminPaginationSchema = z.object({
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
});



export const approveBorrowRequestSchema = z.object({
    params: z.object({
        borrowId: objectIdSchema,
    }),
    body: z.object({
        approved_message: z
            .string()
            .min(3, "accepted message must be at least 3 characters")
            .max(200, "accepted message must be at most 200 characters")
    })
});

export const rejectBorrowRequestSchema = z.object({
    params: z.object({
        borrowId: objectIdSchema,
    }),
    body: z.object({
        rejected_message: z
            .string()
            .min(3, "Rejected message must be at least 3 characters")
            .max(200, "Rejected message must be at most 200 characters")
    })
});

export const cancelBorrowRequestSchema = z.object({
    params: z.object({
        borrowId: objectIdSchema,
    }),
    body: z.object({
        canceled_message: z
            .string()
            .min(3, "Canceled message must be at least 3 characters")
            .max(200, "Canceled message must be at most 200 characters")
    })
});

export const confirmHandoverSchema = z.object({
    params: z.object({
        borrowId: objectIdSchema,
    }),
});

export const payFineInPersonSchema = z.object({
    params: z.object({
        userId: objectIdSchema,
    }),
    body: z.object({
        amountPaid: z
            .number({ message: "Amount paid must be a valid number" })
            .gt(0, "Amount paid must be greater than 0"),
    }),
});

export const BookConditionEnum = z.enum(["GOOD", "DAMAGED", "RUINED"]);
export type BookCondition = z.infer<typeof BookConditionEnum>;

export const returnBookSchema = z.object({
    params: z.object({
        borrowId: objectIdSchema,
    }),
    body: z.object({
        condition: BookConditionEnum
            .default("GOOD")
            .optional(),
    }),
});

export const getBorrowSchema = z.object({
    params: z.object({
        borrowId: objectIdSchema,
    }),
});

export const deleteBorrowSchema = z.object({
    params: z.object({
        borrowId: objectIdSchema,
    }),
});

export const getUserBorrowingHistorySchema = z.object({
    params: z.object({
        userId: objectIdSchema,
    }),
    query: adminPaginationSchema.extend({
        limit: z.coerce.number().int().min(1).max(100).default(10), // Extends max to 100 specifically for history logs
    }).optional()
});

export const getBorrowsQuerySchema = z.object({
    query: adminPaginationSchema.extend({
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