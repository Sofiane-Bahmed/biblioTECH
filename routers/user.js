import express from "express"

import {
    deleteUser,
    getMyProfile
} from "../controllers/user.js"
import { authorize } from "../middleware/authMiddleware.js";

export const userRouter = express.Router();

userRouter.get("/me", authorize("user"), getMyProfile);
userRouter.delete("/:id", authorize("admin"), deleteUser);