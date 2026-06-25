import express from "express"

import {
    approveBorrowRequest,
    rejectBorrowRequest,
    deleteBorrowById,
    getBorrowById,
    getBorrows,
    getUserBorrowingHistory
} from "../../controllers/admin/borrow.js"
import { validate } from "../../middlewares/validate.js";
import {
    getBorrowsQuerySchema,
    approveBorrowRequestSchema,
    rejectBorrowRequestSchema,
    deleteBorrowByIdSchema,
    getBorrowByIdSchema,
    getUserBorrowingHistorySchema,
} from "../../validations/admin-borrow-schema.js";

export const adminBorrowRouter = express.Router();

adminBorrowRouter.get("/", validate(getBorrowsQuerySchema), getBorrows);

adminBorrowRouter.patch("/:id/approve", validate(approveBorrowRequestSchema), approveBorrowRequest);
adminBorrowRouter.patch("/:id/reject", validate(rejectBorrowRequestSchema), rejectBorrowRequest);
adminBorrowRouter.get("/:id/history", validate(getUserBorrowingHistorySchema), getUserBorrowingHistory);

adminBorrowRouter.get("/:id", validate(getBorrowByIdSchema), getBorrowById);
adminBorrowRouter.delete("/:id", validate(deleteBorrowByIdSchema), deleteBorrowById);








