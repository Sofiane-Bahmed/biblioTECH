import express from "express"

import {
    deleteBorrowById,
    getActiveBorrows,
    getAllBorrows,
    getBorrowById,
    getOverdueBorrows,
    getUserBorrowingHistory
} from "../../controllers/admin/borrow.js"
import { validate } from "../../middlewares/validate.js";
import {
    deleteBorrowByIdSchema,
    getBorrowByIdSchema,
    getUserBorrowingHistorySchema
} from "../../validations/admin-user-schema.js";
import {
    getActiveBorrowsSchema,
} from "../../validations/admin-borrow-schema.js";

export const adminBorrowRouter = express.Router();

adminBorrowRouter.get("/", getAllBorrows);
adminBorrowRouter.get("/active", validate(getActiveBorrowsSchema), getActiveBorrows);
adminBorrowRouter.get("/overdue", getOverdueBorrows);
adminBorrowRouter.get("/:id/history", validate(getUserBorrowingHistorySchema), getUserBorrowingHistory);
adminBorrowRouter.get("/:id", validate(getBorrowByIdSchema), getBorrowById);
adminBorrowRouter.delete("/:id", validate(deleteBorrowByIdSchema), deleteBorrowById);








