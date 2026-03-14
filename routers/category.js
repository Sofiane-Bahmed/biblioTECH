import express from "express"

import {
    createBookCategory,
    showBookCategory,
    updateBookCategory,
    deleteBookCategory
} from "../cotrollers/category.js"

export const categoryRouter = express.Router()

categoryRouter.post("/", createBookCategory)
categoryRouter.get("/:id", showBookCategory)
categoryRouter.patch("/:id", updateBookCategory)
categoryRouter.delete("/:id", deleteBookCategory)