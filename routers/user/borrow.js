import express from "express"

import {
        returnBook,
        renewBorrowedBook,
        requestBorrow,
        cancelBorrowRequest,
} from "../../controllers/user/borrow.js"
import { validate } from "../../middlewares/validate.js";
import {
        cancelBorrowRequestSchema,
        renewBorrowedBookSchema,
        requestBorrowSchema,
        returnBookSchema
} from "../../validations/borrow-schema.js";

export const userBorrowRouter = express.Router();

userBorrowRouter.post("/:bookId/request", validate(requestBorrowSchema), requestBorrow)

userBorrowRouter.patch("/:borrowId/cancel", validate(cancelBorrowRequestSchema), cancelBorrowRequest)
userBorrowRouter.patch("/:borrowId/return", validate(returnBookSchema), returnBook)
userBorrowRouter.patch("/:borrowId/renew", validate(renewBorrowedBookSchema), renewBorrowedBook)
