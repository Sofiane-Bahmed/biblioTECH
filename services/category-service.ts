import { Types } from "mongoose";
import { Category } from "../models/category.js";
import { getPaginatedData } from "../utils/paginate.js";

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

export const addCategoryService = async ({
    title,
    description,
}) => {
    const normalizedTitle = title.trim();

    // 1. Check for existing category with the same title (case-insensitive)
    const existingCategory = await Category.findOne({
        title: { $regex: `^${normalizedTitle}$`, $options: "i" },
    });

    if (existingCategory) {
        return {
            status: false,
            code: 409,
            message: "A category with this title already exists.",
        };
    }

    // 2. Create category
    const newCategory = await Category.create({
        title: normalizedTitle,
        description: description?.trim(),
    });

    return {
        status: true,
        code: 201,
        message: "Category added successfully.",
        data: { category: newCategory },
    };
};

export const getCategoryByIdService = async ({ categoryId }) => {
    const category = await Category.findById(categoryId);

    if (!category) {
        return {
            status: false,
            code: 404,
            message: "Category not found.",
        };
    }

    return {
        status: true,
        code: 200,
        message: "Category details retrieved successfully.",
        data: { category },
    };
};

export const getCategoriesService = async ({ req }) => {
    const result = await getPaginatedData({
        model: Category,
        req,
    });

    if (!result || !result.data || !result.data.length) {
        return {
            status: true,
            code: 200,
            message: "No categories found.",
            data: {
                ...result,
                data: [],
            },
        };
    }

    return {
        status: true,
        code: 200,
        message: "Categories retrieved successfully.",
        data: result,
    };
};

export const updateCategoryService = async ({
    categoryId,
    updateData,
}) => {
    // 1. If title is being updated, check for case-insensitive duplicate titles on other documents
    if (updateData.title) {
        const normalizedTitle = updateData.title.trim();
        const duplicateCategory = await Category.findOne({
            _id: { $ne: categoryId },
            title: { $regex: `^${normalizedTitle}$`, $options: "i" },
        });

        if (duplicateCategory) {
            return {
                status: false,
                code: 409,
                message: "A category with this title already exists.",
            };
        }

        updateData.title = normalizedTitle;
    }

    if (updateData.description) {
        updateData.description = updateData.description.trim();
    }

    // 2. Perform update
    const category = await Category.findByIdAndUpdate(
        categoryId,
        { $set: updateData },
        { new: true, runValidators: true }
    );

    if (!category) {
        return {
            status: false,
            code: 404,
            message: "Category not found.",
        };
    }

    return {
        status: true,
        code: 200,
        message: "Category updated successfully.",
        data: { category },
    };
};