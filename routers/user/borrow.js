import express from "express"

import {
        borrowBook,
        returnBook,
        getBorrowingHistory,
        renewBorrowedBook,
} from "../../controllers/user/borrow.js"
import { validate } from "../../middlewares/validate.js";
import {
        borrowBookSchema,
        renewBorrowedBookSchema,
        returnBookSchema
} from "../../validations/borrow.schema.js";

export const userBorrowRouter = express.Router();

userBorrowRouter.get("/history", getBorrowingHistory)

userBorrowRouter.post("/:id/borrow", validate(borrowBookSchema), borrowBook)
userBorrowRouter.patch("/:id/return", validate(returnBookSchema), returnBook)
userBorrowRouter.patch("/:id/renew", validate(renewBorrowedBookSchema), renewBorrowedBook)
