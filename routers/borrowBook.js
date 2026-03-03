import express from "express"

import {
        borrowBook,
        returnBook,
        getBorrowingHistory,
        renewBorrowedBook
} from "../cotrollers/borrowBook.js"

export const borrowBookRouter = express.Router()

livreEmprunteRouter.post("/borrow", borrowBook)
livreEmprunteRouter.post("/borrow/return", returnBook)
livreEmprunteRouter.get("/borrow/history/:userId", getBorrowingHistory)
livreEmprunteRouter.post("/borrow/renew/:borrowId", renewBorrowedBook)
