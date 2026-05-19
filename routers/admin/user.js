import express from "express";

import {
    deleteUser,
    getAllUsers,
    getUserById,
} from "../../controllers/admin/user.js";
import { validate } from "../../middlewares/validate.js";
import {
    deleteUserSchema,
    getAllUsersSchema,
    getUserByIdSchema,
} from "../../validations/user.schema.js";

export const adminUserRouter = express.Router();

adminUserRouter.get("/getAll", validate(getAllUsersSchema), getAllUsers);
adminUserRouter.get("/:id", validate(getUserByIdSchema), getUserById);
adminUserRouter.delete("/:id", validate(deleteUserSchema), deleteUser);

