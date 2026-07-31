import express, { Router } from "express"

import {
    approveBorrowRequest,
    rejectBorrowRequest,
    getBorrows,
    getUserBorrowingHistory,
    getBorrow,
    deleteBorrow,
    cancelBorrow,
    confirmHandover,
    returnBook,
    payFineInPerson,
    bypassQueueIssue
} from "../../controllers/librarian/borrow.js"
import { validate } from "../../middlewares/validate.js";
import {
    getBorrowsQuerySchema,
    approveBorrowRequestSchema,
    rejectBorrowRequestSchema,
    getUserBorrowingHistorySchema,
    cancelBorrowRequestSchema,
    getBorrowSchema,
    deleteBorrowSchema,
    confirmHandoverSchema,
    returnBookSchema,
    payFineInPersonSchema,
    bypassQueueSchema,
} from "../../validations/librarian/borrow/borrow-schema.js";

export const librarianBorrowRouter: Router = express.Router();

librarianBorrowRouter.get("/", validate(getBorrowsQuerySchema), getBorrows);
librarianBorrowRouter.post("/bypass-queue", validate(bypassQueueSchema), bypassQueueIssue);

librarianBorrowRouter.patch("/:borrowId/approve", validate(approveBorrowRequestSchema), approveBorrowRequest);
librarianBorrowRouter.patch("/:borrowId/reject", validate(rejectBorrowRequestSchema), rejectBorrowRequest);
librarianBorrowRouter.patch("/:borrowId/cancel", validate(cancelBorrowRequestSchema), cancelBorrow);
librarianBorrowRouter.patch("/:borrowId/confirm-handover", validate(confirmHandoverSchema), confirmHandover);
librarianBorrowRouter.patch("/:borrowId/return-book", validate(returnBookSchema), returnBook);

librarianBorrowRouter.patch("/:userId/pay-fine", validate(payFineInPersonSchema), payFineInPerson);
librarianBorrowRouter.get("/:userId/history", validate(getUserBorrowingHistorySchema), getUserBorrowingHistory);

librarianBorrowRouter.get("/:borrowId", validate(getBorrowSchema), getBorrow);
librarianBorrowRouter.delete("/:borrowId", validate(deleteBorrowSchema), deleteBorrow);








