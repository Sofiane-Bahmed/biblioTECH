import express from "express"

import {
    deleteUser,
    getAllUsers,
    getMyProfile,
    updateUser
} from "../controllers/user.js"
import { authorize } from "../middleware/authMiddleware.js";

export const userRouter = express.Router();

userRouter.get("/me", authorize("user"), getMyProfile);
userRouter.get("/getAll", authorize("admin"), getAllUsers);
userRouter.put("/:id", authorize("user"), updateUser);
userRouter.delete("/:id", authorize("admin"), deleteUser);