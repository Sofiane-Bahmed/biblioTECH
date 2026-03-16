import express from "express"

import {
    log_out,
    register,
    sign_in,
} from "../cotrollers/user.js"

export const userRouter = express.Router()
 
userRouter.post("/register", register)
userRouter.post("/signin", sign_in)
userRouter.get("/logout", log_out)






