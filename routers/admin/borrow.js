import express from "express"

import {
    approveBorrowRequest,
    rejectBorrowRequest,
    getBorrows,
    getUserBorrowingHistory,
    getBorrow,
    deleteBorrow
} from "../../controllers/admin/borrow.js"
import { validate } from "../../middlewares/validate.js";
import {
    getBorrowsQuerySchema,
    approveBorrowRequestSchema,
    rejectBorrowRequestSchema,
    getUserBorrowingHistorySchema,
    getBorrowSchema,
    deleteBorrowSchema,
} from "../../validations/admin-borrow-schema.js";

export const adminBorrowRouter = express.Router();

adminBorrowRouter.get("/", validate(getBorrowsQuerySchema), getBorrows);

adminBorrowRouter.patch("/:id/approve", validate(approveBorrowRequestSchema), approveBorrowRequest);
adminBorrowRouter.patch("/:id/reject", validate(rejectBorrowRequestSchema), rejectBorrowRequest);
adminBorrowRouter.get("/:id/history", validate(getUserBorrowingHistorySchema), getUserBorrowingHistory);

adminBorrowRouter.get("/:id", validate(getBorrowSchema), getBorrow);
adminBorrowRouter.delete("/:id", validate(deleteBorrowSchema), deleteBorrow);








