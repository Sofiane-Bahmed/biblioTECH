import express from "express"

import {
    register,
    login,
    logout,
    refresh,
    forgotPassword,
    resetPassword
} from "../controllers/auth.js"

import { validate } from "../middlewares/validate.js"
import { registerSchema } from "../validations/user.schema.js"

export const authRouter = express.Router()

authRouter.post("/register", validate(registerSchema), register)
authRouter.post("/login", login)
authRouter.get("/logout", logout)
authRouter.post("/refresh", refresh)
authRouter.post("/forgot-password", forgotPassword)
authRouter.patch("/reset-password/:token", resetPassword)






