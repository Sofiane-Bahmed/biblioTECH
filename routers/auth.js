import express from "express"

import {
    register,
    login,
    logout,
    refresh,
} from "../controllers/auth.js"

export const authRouter = express.Router()
 
authRouter.post("/register", register)
authRouter.post("/login", login)
authRouter.get("/logout", logout)
authRouter.post("/refresh", refresh)






