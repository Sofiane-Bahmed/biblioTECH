import z from "zod";

import {
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema
} from "./auth-schema.js";

export type RegisterRequest = z.infer<typeof registerSchema>;
export type RegisterBody = RegisterRequest["body"];

export type LoginRequest = z.infer<typeof loginSchema>;
export type LoginBody = LoginRequest["body"];

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ForgotPasswordBody = ForgotPasswordRequest["body"];

export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordBody = ResetPasswordRequest["body"];
export type ResetPasswordParams = ResetPasswordRequest["params"];