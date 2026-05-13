import { z } from "zod";

export const getUserByIdSchema = z.object({
    params: z.object({
        id: z.string().min(1, "User ID is required").regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
    }),
});
export const deleteUserSchema = z.object({
    params: z.object({
        id: z.string().min(1, "User ID is required").regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
    }),
});