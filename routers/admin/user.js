import express from "express";

import {
    deleteUser,
    getAllUsers,
    getUserById,
    updateUser
} from "../../controllers/admin/user.js";
import { validate } from "../../middlewares/validate.js";
import {
    deleteUserSchema,
    getAllUsersSchema,
    getUserByIdSchema,
    updateUserSchema
} from "../../validations/user-schema.js";

export const adminUserRouter = express.Router();

adminUserRouter.get("/getAll", validate(getAllUsersSchema), getAllUsers);
adminUserRouter.get("/:id", validate(getUserByIdSchema), getUserById);
adminUserRouter.put("/:id", validate(updateUserSchema), updateUser);
adminUserRouter.delete("/:id", validate(deleteUserSchema), deleteUser);

