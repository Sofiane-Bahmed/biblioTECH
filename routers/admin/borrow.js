import express from "express"

import { getAllBorrows } from "../../controllers/admin/borrow.js"

export const adminBorrowRouter = express.Router();

adminBorrowRouter.get("/", getAllBorrows);








