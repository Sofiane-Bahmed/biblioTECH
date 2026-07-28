import z from "zod";

const objectIdSchema = z
    .string()
    .length(24, "ID must be exactly 24 characters")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

export const borrowSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
});

export const borrowRequestSchema = z.object({
    params: z.object({
        bookId: objectIdSchema,
    }),
});

export const cancelBorrowRequestSchema = z.object({
    params: z.object({
        borrowId: objectIdSchema,
    }),
});


export const renewBorrowSchema = z.object({
    params: z.object({
        borrowId: objectIdSchema,
    }),
});