import express from "express"

import {
    createBookCategory,
    showBookCategory,
    updateBookCategory,
    deleteBookCategory,
    showBookCategories
} from "../../controllers/admin/category.js"
import {
    createBookCategorySchema,
    deleteBookCategorySchema,
    showBookCategorySchema,
    updateBookCategorySchema
} from "../../validations/category-schema.js";
import { validate } from "../../middlewares/validate.js";

export const adminCategoryRouter = express.Router()

adminCategoryRouter.post("/", validate(createBookCategorySchema), createBookCategory)
adminCategoryRouter.get("/", showBookCategories)

adminCategoryRouter.get("/:id", validate(showBookCategorySchema), showBookCategory)
adminCategoryRouter.patch("/:id", validate(updateBookCategorySchema), updateBookCategory)
adminCategoryRouter.delete("/:id", validate(deleteBookCategorySchema), deleteBookCategory)