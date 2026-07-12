import express, { Router } from "express"

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
} from "../../validations/admin/borrow/borrow-schema.js";

export const adminBorrowRouter: Router = express.Router();

adminBorrowRouter.get("/", validate(getBorrowsQuerySchema), getBorrows);

adminBorrowRouter.patch("/:borrowId/approve", validate(approveBorrowRequestSchema), approveBorrowRequest);
adminBorrowRouter.patch("/:borrowId/reject", validate(rejectBorrowRequestSchema), rejectBorrowRequest);
adminBorrowRouter.get("/:userId/history", validate(getUserBorrowingHistorySchema), getUserBorrowingHistory);

adminBorrowRouter.get("/:borrowId", validate(getBorrowSchema), getBorrow);
adminBorrowRouter.delete("/:borrowId", validate(deleteBorrowSchema), deleteBorrow);








