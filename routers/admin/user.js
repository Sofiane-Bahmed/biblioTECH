import express from "express";

import {
    blockUser,
    deleteUser,
    getAllUsers,
    getUserById,
    unblockUser,
    updateUserRole
} from "../../controllers/admin/user.js";
import { validate } from "../../middlewares/validate.js";
import {
    blockUserSchema,
    deleteUserSchema,
    getAllUsersSchema,
    getUserByIdSchema,
    unblockUserSchema,
    updateUserRoleSchema,
} from "../../validations/admin-user-schema.js";

export const adminUserRouter = express.Router();

adminUserRouter.get("/getAll", validate(getAllUsersSchema), getAllUsers);
adminUserRouter.put("/:id/role", validate(updateUserRoleSchema), updateUserRole);
adminUserRouter.put("/:id/block", validate(blockUserSchema), blockUser);
adminUserRouter.put("/:id/unblock", validate(unblockUserSchema), unblockUser);
adminUserRouter.get("/:id", validate(getUserByIdSchema), getUserById);
adminUserRouter.delete("/:id", validate(deleteUserSchema), deleteUser);

