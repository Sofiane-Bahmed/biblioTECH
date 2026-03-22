import { Category } from "../models/category.js"

// create book category
export const createBookCategory = async (req, res) => {

  try {
    const { title } = req.body;

    const newCategory = await Category.create({ title });

    res.status(201).json(newCategory);

  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};

// read a book category
export const showBookCategory = async (req, res) => {

  try {
    const { id } = req.params;
    const categoryId = await Category.findById(id);

    res.status(200).json(categoryId);

  } catch (err) {
    res.status(500).json({ message: "something went wrong" });
  }
};

// update a book category
export const updateBookCategory = async (req, res) => {

  try {
    const { id } = req.params;
    const { title } = req.body;

    const category = await Category.findByIdAndUpdate(
      id,
      {
        title
      },
      {
        new: true,
        runValidators: true
      }
    );
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.status(200).json(category);

  } catch (error) {
    res.status(500).json({ message: error });
  }
};

// delete a book category
export const deleteBookCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.status(200).json({ message: 'Category successfully deleted' });

  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};