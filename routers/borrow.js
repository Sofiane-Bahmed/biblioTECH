import express from "express"

import {
        borrowBook,
        returnBook,
        getBorrowingHistory,
        renewBorrowedBook,
        getAllBorrows
} from "../controllers/borrow.js"
import { authorize } from "../middlewares/authMiddleware.js"
import { validate } from "../middlewares/validate.js";
import {
        borrowBookSchema,
        renewBorrowedBookSchema,
        returnBookSchema
} from "../validations/borrow.schema.js";

export const borrowBookRouter = express.Router();

// Admin routes
const adminRoutes = express.Router();
adminRoutes.use(authorize("admin"));

adminRoutes.get("/", getAllBorrows);

borrowBookRouter.use("/admin", adminRoutes)

// User routes
borrowBookRouter.use(authorize("user"));

borrowBookRouter.get("/history", getBorrowingHistory)
borrowBookRouter.post("/:id/borrow", validate(borrowBookSchema), borrowBook)
borrowBookRouter.patch("/:id/return", validate(returnBookSchema), returnBook)
borrowBookRouter.patch("/:id/renew", validate(renewBorrowedBookSchema), renewBorrowedBook)
