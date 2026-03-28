import express from "express"

import { deleteUser } from "../controllers/user.js"

export const userRouter = express.Router();

userRouter.delete("/:id", deleteUser);