import { Response } from "express";

import asyncHandler from "../../utils/async-handler.js";

import {
  AddCategoryBody,
  DeleteCategoryParams,
  getCategoriesQuery,
  GetCategoryParams,
  UpdateCategoryBody,
  UpdateCategoryParams
} from "../../validations/admin/category/category-types.js";
import { AuthenticatedRequest } from "../../types/auth.js";
import { addCategoryService, deleteCategoryService, getCategoriesService, getCategoryByIdService, updateCategoryService } from "../../services/category-service.js";

export const addCategory = asyncHandler(async (
  req: AuthenticatedRequest<any, AddCategoryBody, any>,
  res: Response
): Promise<void> => {
  const { title, description } = req.body;

  const result = await addCategoryService({ title, description });

  res.status(result.code).json(result);
});

export const getCategory = asyncHandler(async (
  req: AuthenticatedRequest<GetCategoryParams, any, any>,
  res: Response
): Promise<void> => {
  const { categoryId } = req.params;

  const result = await getCategoryByIdService({ categoryId });

  res.status(result.code).json(result);
});

export const getCategories = asyncHandler(async (
  req: AuthenticatedRequest<any, any, getCategoriesQuery>,
  res: Response
): Promise<void> => {
  const result = await getCategoriesService({ req });

  res.status(result.code).json(result);
});

export const updateCategory = asyncHandler(async (
  req: AuthenticatedRequest<UpdateCategoryParams, UpdateCategoryBody, any>,
  res: Response
): Promise<void> => {
  const { categoryId } = req.params;

  const result = await updateCategoryService({
    categoryId,
    updateData: req.body,
  });

  res.status(result.code).json(result);
});

export const deleteCategory = asyncHandler(async (
  req: AuthenticatedRequest<DeleteCategoryParams, any, any>,
  res: Response
): Promise<void> => {
  const { categoryId } = req.params;

  const result = await deleteCategoryService({ categoryId });

  res.status(result.code).json(result);
});