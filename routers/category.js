import express from "express"

import {
    createBookCategory,
    showBookCategory,
    updateBookCategory,
    deleteBookCategory
} from "../cotrollers/category.js"

export const categoryRouter = express.Router()

categoryRouter.post("/category", createBookCategory)
categoryRouter.get("/category/:id", showBookCategory)
categoryRouter.patch("/category/:id", updateBookCategory)
categoryRouter.delete("/category/:id", deleteBookCategory)