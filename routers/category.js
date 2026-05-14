import express from "express"

import {
    createBookCategory,
    showBookCategory,
    updateBookCategory,
    deleteBookCategory,
    showBookCategories
} from "../controllers/category.js"
import { authorize } from "../middlewares/authMiddleware.js"
import { createBookCategorySchema } from "../validations/category.schema.js";
import { validate } from "../middlewares/validate.js";

export const categoryRouter = express.Router()

categoryRouter.use(authorize("admin"));

categoryRouter.post("/", validate(createBookCategorySchema), createBookCategory)
categoryRouter.get("/", showBookCategories)
categoryRouter.get("/:id", showBookCategory)
categoryRouter.patch("/:id", updateBookCategory)
categoryRouter.delete("/:id", deleteBookCategory)