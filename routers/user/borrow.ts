import express, { Router } from "express"

import {
        renewBorrow,
        BorrowRequest,
        cancelBorrowRequest,
} from "../../controllers/user/borrow.js"
import { validate } from "../../middlewares/validate.js";
import {
        cancelBorrowRequestSchema,
        renewBorrowSchema,
        borrowRequestSchema,
} from "../../validations/user/borrow/borrow-schema.js";

export const userBorrowRouter: Router = express.Router();

userBorrowRouter.post("/:bookId/request", validate(borrowRequestSchema), BorrowRequest)

userBorrowRouter.patch("/:borrowId/cancel", validate(cancelBorrowRequestSchema), cancelBorrowRequest)
userBorrowRouter.patch("/:borrowId/renew", validate(renewBorrowSchema), renewBorrow)
