import express from "express"

import {
        borrowBook,
        returnBook,
        getBorrowingHistory,
        renewBorrowedBook,
        getAllBorrows
} from "../controllers/borrow.js"
import { authorize } from "../middlewares/authMiddleware.js"

export const borrowBookRouter = express.Router();

// Admin routes
const adminRoutes = express.Router();
adminRoutes.use(authorize("admin"));

adminRoutes.get("/", getAllBorrows);

borrowBookRouter.use("/admin", adminRoutes)

// User routes
borrowBookRouter.use(authorize("user"));

borrowBookRouter.post("/", borrowBook)
borrowBookRouter.get("/history", getBorrowingHistory)
borrowBookRouter.patch("/:id/return", returnBook)
borrowBookRouter.patch("/:id/renew", renewBorrowedBook)
