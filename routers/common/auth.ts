import express, { Router } from "express"

import {
    register,
    login,
    logout,
    refresh,
    forgotPassword,
    resetPassword
} from "../../controllers/common/auth.js"

import { validate } from "../../middlewares/validate.js"
import {
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema
} from "../../validations/common/auth/auth-schema.js"

export const authRouter: Router = express.Router()

authRouter.post("/register", validate(registerSchema), register)
authRouter.post("/login", validate(loginSchema), login)
authRouter.patch("/reset-password/:token", validate(resetPasswordSchema), resetPassword)

authRouter.get("/logout", logout)
authRouter.post("/refresh", refresh)
authRouter.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword)






