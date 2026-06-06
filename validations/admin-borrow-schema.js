import z from "zod";

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