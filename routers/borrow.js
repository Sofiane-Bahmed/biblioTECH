import express from "express"

import {
        borrowBook,
        returnBook,
        getBorrowingHistory,
        renewBorrowedBook
} from "../controllers/borrow.js"
import { authorize } from "../middlewares/authMiddleware.js"

export const borrowBookRouter = express.Router();

borrowBookRouter.use(authorize("user"));

borrowBookRouter.post("/", borrowBook)
borrowBookRouter.get("/history", getBorrowingHistory)
borrowBookRouter.patch("/:id/return", returnBook)
borrowBookRouter.patch("/:id/renew", renewBorrowedBook)
