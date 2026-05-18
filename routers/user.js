import express from "express";

import {
    deleteUser,
    getAllUsers,
    getMyProfile,
    getUserById,
    updateUser
} from "../controllers/user.js";
// import { authorize } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.js";
import {
    deleteUserSchema,
    getAllUsersSchema,
    getUserByIdSchema,
    updateUserSchema
} from "../validations/user.schema.js";

export const userRouter = express.Router();

//Admin routes
const adminRoutes = express.Router();
// adminRoutes.use(authorize("admin"));

adminRoutes.get("/getAll", validate(getAllUsersSchema), getAllUsers);
adminRoutes.get("/:id", validate(getUserByIdSchema), getUserById);
adminRoutes.delete("/:id", validate(deleteUserSchema), deleteUser);

userRouter.use("/admin", adminRoutes);

// User routes
const userRoutes = express.Router();
// userRoutes.use(authorize("user"));

userRoutes.get("/me", getMyProfile);
userRoutes.put("/:id", validate(updateUserSchema), updateUser);

userRouter.use("/", userRoutes);
