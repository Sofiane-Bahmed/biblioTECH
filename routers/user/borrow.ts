import express, { Router } from "express"

import {
        returnBook,
        renewBorrow,
        requestBorrow,
        cancelBorrowRequest,
} from "../../controllers/user/borrow.js"
import { validate } from "../../middlewares/validate.js";
import {
        cancelBorrowRequestSchema,
        renewBorrowSchema,
        requestBorrowSchema,
        returnBookSchema
} from "../../validations/user/borrow/borrow-schema.js";

export const userBorrowRouter: Router = express.Router();

userBorrowRouter.post("/:bookId/request", validate(requestBorrowSchema), requestBorrow)

userBorrowRouter.patch("/:borrowId/cancel", validate(cancelBorrowRequestSchema), cancelBorrowRequest)
userBorrowRouter.patch("/:borrowId/return", validate(returnBookSchema), returnBook)
userBorrowRouter.patch("/:borrowId/renew", validate(renewBorrowSchema), renewBorrow)
