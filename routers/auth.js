import express from "express"

import {
    register,
    login,
    logout,
} from "../cotrollers/user.js"

export const authRouter = express.Router()
 
authRouter.post("/register", register)
authRouter.post("/login", login)
authRouter.get("/logout", logout)






