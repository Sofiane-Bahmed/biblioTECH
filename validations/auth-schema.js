import { z } from "zod";

export const registerSchema = z.object({
    body: z.object({
        fullName: z
            .string()
            .min(3, "Full name must be at least 3 characters"),
        email: z.
            string()
            .email("Invalid email format"),
        password: z.
            string()
            .min(8, "Password must be at least 8 characters"),
        confirmPassword: z
            .string({ required_error: "Please confirm your password" }),
        role: z
            .enum(["user", "admin"]).optional(),
    }),
}).refine((data) => data.body.password === data.body.confirmPassword, {
    message: "Passwords do not match",
    path: ["body", "confirmPassword"],
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email format"),
        password: z.string().min(8, "Password must be at least 8 characters"),
    }),
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email format"),
    }),
});

export const resetPasswordSchema = z.object({
    params: z.object({
        token: z.string().min(1, "Reset token is required"),
    }),
    body: z.object({
        password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password must be at most 100 characters"),
    }),
});