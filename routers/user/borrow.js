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

userBorrowRouter.post("/:id/request-borrow", validate(requestBorrowSchema), requestBorrow)
userBorrowRouter.post("/:id/cancel-borrow", validate(cancelBorrowRequestSchema), cancelBorrowRequest)
userBorrowRouter.patch("/:id/return", validate(returnBookSchema), returnBook)
userBorrowRouter.patch("/:id/renew", validate(renewBorrowedBookSchema), renewBorrowedBook)
