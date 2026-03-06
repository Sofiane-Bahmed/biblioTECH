import express from "express"

import {
        borrowBook,
        returnBook,
        getBorrowingHistory,
        renewBorrowedBook
} from "../cotrollers/borrowBook.js"

export const borrowBookRouter = express.Router()

borrowBookRouter.post("/borrow", borrowBook)
borrowBookRouter.post("/borrow/return", returnBook)
borrowBookRouter.get("/borrow/history/:userId", getBorrowingHistory)
borrowBookRouter.post("/borrow/renew/:borrowId", renewBorrowedBook)
