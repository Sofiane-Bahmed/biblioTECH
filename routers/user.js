import express from "express"

import {
    deleteUser,
    getAllUsers,
    getMyProfile
} from "../controllers/user.js"
import { authorize } from "../middleware/authMiddleware.js";

export const userRouter = express.Router();

userRouter.get("/me", authorize("user"), getMyProfile);
userRouter.get("/all", authorize("admin"), getAllUsers);
userRouter.delete("/:id", authorize("admin"), deleteUser);