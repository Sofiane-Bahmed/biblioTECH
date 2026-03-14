import express from "express"

import {
        borrowBook,
        returnBook,
        getBorrowingHistory,
        renewBorrowedBook
} from "../cotrollers/borrowBook.js"

export const borrowBookRouter = express.Router()

borrowBookRouter.post("/", borrowBook)
borrowBookRouter.patch("/:id/return", returnBook)
borrowBookRouter.patch("/:id/renew", renewBorrowedBook)
borrowBookRouter.get("/history/:userId", getBorrowingHistory)
