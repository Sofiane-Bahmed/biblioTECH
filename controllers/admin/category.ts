import { Response } from "express";

import { Category } from "../../models/category.js"
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
import { getPaginatedData } from "../../utils/paginate.js";
import { addCategoryService, getCategoryByIdService } from "../../services/category-service.js";

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

  const result = await getPaginatedData({
    model: Category,
    req
  })

  if (!result.data.length) {
    res.status(404).json({ message: 'No categories found' });
    return;
  }

  res.status(200).json(result);
});

export const updateCategory = asyncHandler(async (
  req: AuthenticatedRequest<UpdateCategoryParams, UpdateCategoryBody, any>,
  res: Response
): Promise<void> => {

  const { categoryId } = req.params;

  const updateData = { ...req.body };

  const category = await Category.findByIdAndUpdate(
    categoryId,
    {
      $set: updateData
    },
    {
      new: true,
      runValidators: true
    }
  );
  if (!category) {
    res.status(404).json({ message: 'Category not found' });
    return;
  }

  res.status(200).json({
    message: 'Category updated successfully',
    category
  });

});

export const deleteCategory = asyncHandler(async (
  req: AuthenticatedRequest<DeleteCategoryParams, any, any>,
  res: Response
): Promise<void> => {

  const { categoryId } = req.params;

  const category = await Category.findByIdAndDelete(categoryId);
  if (!category) {
    res.status(404).json({ message: 'Category not found' });
    return;
  }

  res.status(200).json({ message: 'Category successfully deleted' });

}); 