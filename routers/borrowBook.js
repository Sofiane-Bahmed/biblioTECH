import express from "express"

import {
        borrowBook,
        returnBook,
        getBorrowingHistory,
        renewBorrowedBook
} from "../cotrollers/borrowBook.js"

export const livreEmprunteRouter = express.Router()

livreEmprunteRouter.post("/emprunte", borrowBook)
livreEmprunteRouter.post("/emprunte/return", returnBook)
livreEmprunteRouter.get("/emprunte/history/:userId", getBorrowingHistory)
livreEmprunteRouter.post("/emprunte/renew/:borrowId", renewBorrowedBook)
