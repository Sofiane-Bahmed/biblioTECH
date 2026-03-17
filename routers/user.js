import express from "express"

import {
    register,
    login,
    logout,
} from "../cotrollers/user.js"

export const userRouter = express.Router()
 
userRouter.post("/register", register)
userRouter.post("/login", login)
userRouter.get("/logout", logout)






