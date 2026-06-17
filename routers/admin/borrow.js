import express from "express"

import {
    approveBorrowRequest,
    deleteBorrowById,
    getActiveBorrows,
    getAllBorrows,
    getBorrowById,
    getOverdueBorrows,
    getPendingBorrows,
    getUserBorrowingHistory
} from "../../controllers/admin/borrow.js"
import { validate } from "../../middlewares/validate.js";
import {
    approveBorrowRequestSchema,
    getActiveBorrowsSchema,
    getPendingBorrowsSchema,
    deleteBorrowByIdSchema,
    getBorrowByIdSchema,
    getUserBorrowingHistorySchema
} from "../../validations/admin-borrow-schema.js";

export const adminBorrowRouter = express.Router();

adminBorrowRouter.get("/", getAllBorrows);
adminBorrowRouter.get("/pending", validate(getPendingBorrowsSchema), getPendingBorrows);
adminBorrowRouter.get("/active", validate(getActiveBorrowsSchema), getActiveBorrows);
adminBorrowRouter.get("/overdue", getOverdueBorrows);
adminBorrowRouter.patch("/:id/approve", validate(approveBorrowRequestSchema), approveBorrowRequest);
adminBorrowRouter.get("/:id/history", validate(getUserBorrowingHistorySchema), getUserBorrowingHistory);
adminBorrowRouter.get("/:id", validate(getBorrowByIdSchema), getBorrowById);
adminBorrowRouter.delete("/:id", validate(deleteBorrowByIdSchema), deleteBorrowById);








