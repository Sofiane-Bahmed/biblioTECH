import express from "express"

import {
    deleteBorrowById,
    getAllBorrows,
    getBorrowById
} from "../../controllers/admin/borrow.js"
import { validate } from "../../middlewares/validate.js";
import {
    deleteBorrowByIdSchema,
    getBorrowByIdSchema
} from "../../validations/admin-user-schema.js";

export const adminBorrowRouter = express.Router();

adminBorrowRouter.get("/", getAllBorrows);
adminBorrowRouter.get("/:id", validate(getBorrowByIdSchema), getBorrowById);
adminBorrowRouter.delete("/:id", validate(deleteBorrowByIdSchema), deleteBorrowById);








