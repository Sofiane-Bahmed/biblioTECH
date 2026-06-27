import express from "express"

import {
    addCategory,
    getCategories,
    getCategory,
    updateCategory,
    deleteCategory
} from "../../controllers/admin/category.js"
import {
    addCategorySchema,
    deleteCategorySchema,
    getCategorySchema,
    updateCategorySchema
} from "../../validations/category-schema.js";
import { validate } from "../../middlewares/validate.js";

export const adminCategoryRouter = express.Router()

adminCategoryRouter.post("/", validate(addCategorySchema), addCategory)
adminCategoryRouter.get("/", getCategories)

adminCategoryRouter.get("/:categoryId", validate(getCategorySchema), getCategory)
adminCategoryRouter.patch("/:categoryId", validate(updateCategorySchema), updateCategory)
adminCategoryRouter.delete("/:categoryId", validate(deleteCategorySchema), deleteCategory)