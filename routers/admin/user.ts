import express, { Router } from "express";

import {
    blockUser,
    createStaff,
    deleteUser,
    getUser,
    getUsers,
    unblockUser,
    updateUserRole
} from "../../controllers/admin/user.js";
import { validate } from "../../middlewares/validate.js";
import {
    blockUserSchema,
    createStaffSchema,
    deleteUserSchema,
    getUserSchema,
    getUsersSchema,
    unblockUserSchema,
    updateUserRoleSchema,
} from "../../validations/admin/user/user-schema.js";

export const adminUserRouter: Router = express.Router();

adminUserRouter.post("/create-staff", validate(createStaffSchema), createStaff);
adminUserRouter.get("/get-all", validate(getUsersSchema), getUsers);

adminUserRouter.put("/:id/role", validate(updateUserRoleSchema), updateUserRole);
adminUserRouter.put("/:userId/block", validate(blockUserSchema), blockUser);
adminUserRouter.put("/:userId/unblock", validate(unblockUserSchema), unblockUser);

adminUserRouter.get("/:userId", validate(getUserSchema), getUser);
adminUserRouter.delete("/:userId", validate(deleteUserSchema), deleteUser);


