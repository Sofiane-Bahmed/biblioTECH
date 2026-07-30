import z from "zod"

const objectIdSchema = z
    .string()
    .length(24, "ID must be exactly 24 characters")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

export const extendPickupDeadlineSchema = z.object({
    params: z.object({
        reservationId: objectIdSchema
    }),
    body: z.object({
        extensionHours: z
            .coerce
            .number()
            .int()
            .min(1, "Extension must be at least 1 hour")
            .max(48, "Extension cannot exceed 48 hours")
            .default(24),
        reason: z
            .string()
            .min(5, "Reason must be at least 5 characters")
            .max(200, "Reason must be at most 200 characters"),
    })
});

export const placeStaffHoldSchema = z.object({
    body: z.object({
        userId: objectIdSchema,
        bookId: objectIdSchema,
        reason: z
            .string()
            .min(5, "Reason must be at least 5 characters")
            .max(200, "Reason must be at most 200 characters"),
    })
});

export const forceQueuePositionSchema = z.object({
    params: z.object({
        reservationId: objectIdSchema
    }),
    body: z.object({
        newPosition: z
            .coerce
            .number()
            .int()
            .min(1, "New position must be at least 1")
            .default(1),
        reason: z
            .string()
            .min(5, "Reason must be at least 5 characters")
            .max(200, "Reason must be at most 200 characters"),
    })
});
