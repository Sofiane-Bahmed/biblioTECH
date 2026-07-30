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
            .min(1)
            .max(48)
            .default(24),
        reason: z
            .string()
            .min(5, "Reason must be at least 5 characters")
            .max(200, "Reason must be at most 100 characters"),
    })
})
