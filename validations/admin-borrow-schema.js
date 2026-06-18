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

export const getBorrowByIdSchema = z.object({
    params: z.object({
        id: z
            .string()
            .min(1, "Borrow ID is required")
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid borrow ID format"),
    }),
});

export const deleteBorrowByIdSchema = z.object({
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

export const getPendingBorrowsSchema = z.object({
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


export const getActiveBorrowsSchema = z.object({
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

// export const getOverdueBorrowsSchema = z.object({
//     query: z.object({
//         page: z
//             .coerce
//             .number()
//             .int()
//             .min(1).
//             default(1),
//         limit: z
//             .coerce
//             .number()
//             .int()
//             .min(1)
//             .max(100)
//             .default(10),
//     }).optional()
// });