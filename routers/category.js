import express from "express"

import {
    createBookCategory,
    showBookCategory,
    updateBookCategory,
    deleteBookCategory
} from "../controllers/category.js"
import { authorize } from "../middleware/authMiddleware.js"

export const categoryRouter = express.Router()

categoryRouter.post("/", authorize("admin"), createBookCategory)
categoryRouter.get("/:id", showBookCategory)
categoryRouter.patch("/:id", authorize("admin"), updateBookCategory)
categoryRouter.delete("/:id", authorize("admin"), deleteBookCategory)