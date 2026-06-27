import express from "express";

import {
    blockUser,
    deleteUser,
    getUser,
    getUsers,
    unblockUser,
    updateUserRole
} from "../../controllers/admin/user.js";
import { validate } from "../../middlewares/validate.js";
import {
    blockUserSchema,
    deleteUserSchema,
    getUserSchema,
    getUsersSchema,
    unblockUserSchema,
    updateUserRoleSchema,
} from "../../validations/admin-user-schema.js";

export const adminUserRouter = express.Router();

adminUserRouter.get("/get-all", validate(getUsersSchema), getUsers);
adminUserRouter.put("/:id/role", validate(updateUserRoleSchema), updateUserRole);
adminUserRouter.put("/:userId/block", validate(blockUserSchema), blockUser);
adminUserRouter.put("/:userId/unblock", validate(unblockUserSchema), unblockUser);
adminUserRouter.get("/:userId", validate(getUserSchema), getUser);
adminUserRouter.delete("/:userId", validate(deleteUserSchema), deleteUser);


