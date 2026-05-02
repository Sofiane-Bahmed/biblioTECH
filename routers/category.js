import express from "express"

import {
    createBookCategory,
    showBookCategory,
    updateBookCategory,
    deleteBookCategory
} from "../controllers/category.js"
import { authorize } from "../middleware/authMiddleware.js"

export const categoryRouter = express.Router()

categoryRouter.use(authorize("admin"));

categoryRouter.post("/", createBookCategory)
categoryRouter.get("/:id", showBookCategory)
categoryRouter.patch("/:id", updateBookCategory)
categoryRouter.delete("/:id", deleteBookCategory)