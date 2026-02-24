import express from "express"

import {
    log_out,
    register,
    sign_in,
    getAllBooks,
    roleValidation,
    sendEmailNotification
} from "../cotrollers/user.js"

export const userRouter = express.Router()

userRouter.post("/register", register)
userRouter.post("/signin", sign_in)
userRouter.get("/logout", log_out)
userRouter.get("/getBooks", getAllBooks)
userRouter.get("/verifyUser", roleValidation)
userRouter.post("/sendEmail", sendEmailNotification)






