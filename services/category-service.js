import { Category } from "../models/category.js";

export const getOrCreateCategories = async (categoryTitles) => {
    const normalizedTitles = categoryTitles.map(title => title.toLowerCase());

    const existingCategories = await Category.find({ title: { $in: normalizedTitles } });
    const existingTitles = existingCategories.map(cat => cat.title);

    const missingTitles = normalizedTitles.filter(title => !existingTitles.includes(title));

    // Bulk create missing categories if any exist
    let newCategories = [];
    if (missingTitles.length > 0) {
        newCategories = await Category.create(missingTitles.map(title => ({ title })));
    }

    // Combine both sets of IDs to return
    return [...existingCategories, ...newCategories].map(cat => cat._id);
};

export const validateExistingCategories = async (inputCategories) => {
    const categoryTitles = Array.isArray(inputCategories) ? inputCategories : [inputCategories];

    const foundCategories = await Category.find({ title: { $in: categoryTitles } });
    const foundTitles = foundCategories.map(cat => cat.title);

    const missingCategories = categoryTitles.filter(title => !foundTitles.includes(title));
    const categoryIds = foundCategories.map(cat => cat._id);

    return { categoryIds, missingCategories };
};