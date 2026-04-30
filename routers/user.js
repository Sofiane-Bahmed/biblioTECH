import express from "express"

import {
    deleteUser,
    getAllUsers,
    getMyProfile,
    updateUser
} from "../controllers/user.js"
import { authorize } from "../middleware/authMiddleware.js";

export const userRouter = express.Router();

//Admin routes
const adminRoutes = express.Router();
adminRoutes.use(authorize("admin"));

adminRoutes.get("/getAll", getAllUsers);
adminRoutes.delete("/:id", deleteUser);

userRouter.use("/admin", adminRoutes);

// User routes
const userRoutes = express.Router();
userRoutes.use(authorize("user"));

userRoutes.get("/me", getMyProfile);
userRoutes.put("/:id", updateUser);

userRouter.use("/", userRoutes);
