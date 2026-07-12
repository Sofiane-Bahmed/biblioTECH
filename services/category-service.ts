import { Types } from "mongoose";
import { Category } from "../models/category.js";

interface CategoryValidationResult {
    categoryIds: Types.ObjectId[];
    missingCategories: string[];
}

export const getOrCreateCategories = async (
    categoryTitles: string[]
): Promise<Types.ObjectId[]> => {
    const normalizedTitles = categoryTitles.map(title => title.toLowerCase());

    const existingCategories = await Category.find({ title: { $in: normalizedTitles } });
    const existingTitles = existingCategories.map(cat => cat.title);

    const missingTitles = normalizedTitles.filter(title => !existingTitles.includes(title));

    let newCategories: any[] = [];
    if (missingTitles.length > 0) {
        newCategories = await Category.create(missingTitles.map(title => ({ title })));
    }

    return [...existingCategories, ...newCategories].map(cat => cat._id as Types.ObjectId);
};

export const validateExistingCategories = async (
    inputCategories: string | string[]
): Promise<CategoryValidationResult> => {
    const categoryTitles = Array.isArray(inputCategories) ? inputCategories : [inputCategories];

    const foundCategories = await Category.find({ title: { $in: categoryTitles } });
    const foundTitles = foundCategories.map(cat => cat.title);

    const missingCategories = categoryTitles.filter(title => !foundTitles.includes(title));
    const categoryIds = foundCategories.map(cat => cat._id as Types.ObjectId);

    return { categoryIds, missingCategories };
}; 