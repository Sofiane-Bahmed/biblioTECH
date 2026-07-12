import z from "zod";

import {
    addCategorySchema,
    deleteCategorySchema,
    getCategoriesSchema,
    getCategorySchema,
    updateCategorySchema
} from "./category-schema.js";

export type AddCategoryRequest = z.infer<typeof addCategorySchema>;
export type AddCategoryBody = AddCategoryRequest["body"];

export type getCategoriesRequest = z.infer<typeof getCategoriesSchema>
export type getCategoriesQuery = NonNullable<getCategoriesRequest["query"]>

export type GetCategoryRequest = z.infer<typeof getCategorySchema>;
export type GetCategoryParams = GetCategoryRequest["params"];

export type UpdateCategoryRequest = z.infer<typeof updateCategorySchema>;
export type UpdateCategoryParams = UpdateCategoryRequest["params"];
export type UpdateCategoryBody = UpdateCategoryRequest["body"];

export type DeleteCategoryRequest = z.infer<typeof deleteCategorySchema>;
export type DeleteCategoryParams = DeleteCategoryRequest["params"];