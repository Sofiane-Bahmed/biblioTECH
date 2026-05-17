import express from "express"

import {
    createBookCategory,
    showBookCategory,
    updateBookCategory,
    deleteBookCategory,
    showBookCategories
} from "../controllers/category.js"
import { authorize } from "../middlewares/authMiddleware.js"
import {
    createBookCategorySchema,
    deleteBookCategorySchema,
    showBookCategorySchema,
    updateBookCategorySchema
} from "../validations/category.schema.js";
import { validate } from "../middlewares/validate.js";

export const categoryRouter = express.Router()

categoryRouter.use(authorize("admin"));

categoryRouter.post("/", validate(createBookCategorySchema), createBookCategory)
categoryRouter.get("/", showBookCategories)

categoryRouter.get("/:id", validate(showBookCategorySchema), showBookCategory)
categoryRouter.patch("/:id", validate(updateBookCategorySchema), updateBookCategory)
categoryRouter.delete("/:id", validate(deleteBookCategorySchema), deleteBookCategory)