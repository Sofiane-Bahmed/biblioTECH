import express from "express"

import {
        borrowBook,
        returnBook,
        getBorrowingHistory,
        renewBorrowedBook
} from "../controllers/borrowBook.js"
import { authorize } from "../middleware/authMiddleware.js"

export const borrowBookRouter = express.Router()

borrowBookRouter.post("/", authorize("user"), borrowBook)
borrowBookRouter.patch("/:id/return", returnBook)
borrowBookRouter.patch("/:id/renew", renewBorrowedBook)
borrowBookRouter.get("/history/:userId", getBorrowingHistory)
