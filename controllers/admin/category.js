import { Category } from "../../models/category.js"
import asyncHandler from "../../utils/async-handler.js";

export const addCategory = asyncHandler(async (req, res) => {

  const { title, description } = req.body;

  const newCategory = await Category.create({ title, description });

  res.status(201).json(newCategory);

});

export const getCategory = asyncHandler(async (req, res) => {

  const { id } = req.params;

  const category = await Category.findById(id);

  res.status(200).json(category);

});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().lean().exec();

  res.status(200).json(categories);
});

export const updateCategory = asyncHandler(async (req, res) => {

  const { id } = req.params;

  const updateData = { ...req.body };

  const category = await Category.findByIdAndUpdate(
    id,
    {
      $set: updateData
    },
    {
      new: true,
      runValidators: true
    }
  );
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  res.status(200).json({
    message: 'Category updated successfully',
    category
  });

});

export const deleteCategory = asyncHandler(async (req, res) => {

  const { id } = req.params;

  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  res.status(200).json({ message: 'Category successfully deleted' });

}); 