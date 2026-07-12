import express, { Router } from "express"

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
} from "../../validations/admin/category/category-schema.js";
import { validate } from "../../middlewares/validate.js";

export const adminCategoryRouter: Router = express.Router();

adminCategoryRouter.post("/", validate(addCategorySchema), addCategory);
adminCategoryRouter.get("/", getCategories);

adminCategoryRouter.get("/:categoryId", validate(getCategorySchema), getCategory);
adminCategoryRouter.patch("/:categoryId", validate(updateCategorySchema), updateCategory);
adminCategoryRouter.delete("/:categoryId", validate(deleteCategorySchema), deleteCategory);