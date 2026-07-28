import { z } from "zod";

const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/

export const registerSchema = z
    .object({
        body: z.object({
            fullName: z
                .string()
                .min(3, { message: "Full name must be at least 3 characters" }),
            email: z
                .string()
                .email({ message: "Invalid email format" }),
            phone: z
                .string({ message: "Phone number is required" })
                .min(10, { message: "Phone number must be at least 10 digits" })
                .regex(phoneRegex, {
                    message: "Invalid phone number format",
                })
                .optional(),
            password: z
                .string()
                .min(8, { message: "Password must be at least 8 characters" }),
            confirmPassword: z
                .string({ message: "Please confirm your password" })
                .min(1, { message: "Please confirm your password" }),
            role: z
                .enum(["user", "admin"])
                .optional(),
        }),
    })
    .refine((data) => data.body.password === data.body.confirmPassword, {
        message: "Passwords do not match",
        path: ["body", "confirmPassword"],
    });

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email({ message: "Invalid email format" }),
        password: z.string().min(8, { message: "Password must be at least 8 characters" }),
    }),
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email({ message: "Invalid email format" }),
    }),
});

export const resetPasswordSchema = z.object({
    params: z.object({
        token: z.string().min(1, { message: "Reset token is required" }),
    }),
    body: z.object({
        password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(100, { message: "Password must be at most 100 characters" }),
    }),
});