import { Categorie } from "../models/categorieModel.js"

// create livre categorie

export const createBookCategory = async (req, res) => {
  try {
    const { titre } = req.body;

    const newCategory = new Categorie({ titre });

    await newCategory.save();

    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};

// read a book categorie

export const showBookCategorie = async (req, res) => {
  try {
    const id = req.params.id;
    const categorie = await Categorie.findById(id);

    res.send(categorie);
  } catch (err) {
    res.send("something went wrong");
  }
};

// update a book categorie

export const updateBookCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { titre } = req.body;

    const category = await Categorie.findById(id);

    if (!category) {
      return res.status(404).json({ message: 'Categorie non trouvée' });
    }

    category.titre = titre;
    await category.save();

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

// delete a book categorie

export const deleteBookCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Categorie.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({ message: 'Categorie non trouvée' });
    }

    res.status(200).json({ message: 'Categorie supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};