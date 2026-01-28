import { Livre } from "../models/livreModel.js"
import { Categorie } from "../models/categorieModel.js";
import { Comment } from "../models/livreModel.js"
import { User } from "../models/userModel.js"
import { LivreEmprunte } from "../models/livreEmprunteModel.js"
import { sendEmailNotification } from "../cotrollers/userController.js"




// add books :

export const addBook = async (req, res) => {
  try {
    const { titre, auteur, copies_disponibles, categorie } = req.body;

    // Check if category exists
    const existingCategory = await Categorie.findOne({ titre: categorie });
    if (!existingCategory) {
      return res.status(400).json({ message: 'Category does not exist' });
    }

    // Create new book
    const newBook = new Livre({ titre, auteur, copies_disponibles, categorie: existingCategory._id });
    await newBook.save();

    // Send email notification to subscribers
    const subscribers = await User.find({ subscribed: true });

    for (const subscriber of subscribers) {
      const subject = 'New Book Added';
      const text = `A new book titled "${titre}" by ${auteur} has been added to the library. Check it out now!`;
      sendEmailNotification(subscriber.email, subject, text);
    }

    res.status(201).json(newBook);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};



// reserch books by filtring : 

export const searchBooks = async (req, res) => {
  try {
    const { titre, author, category, availableCopies } = req.query;

    let filters = {};
    if (titre) {
      filters.titre = { $regex: titre, $options: 'i' };
    }
    if (author) {
      filters.auteur = { $regex: author, $options: 'i' };
    }
    if (category) {
      const categoryId = await Categorie.findOne({ titre: category });
      if (categoryId) {
        filters.category = categoryId._id;
      } else {
        return res.status(400).json({ message: 'Category not found' });
      }
    }
    if (availableCopies) {
      filters.copies_disponibles = { $gte: availableCopies };
    }

    const books = await Livre.find(filters).populate('categorie', 'titre');

    res.status(200).json(books);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};


//add comment and the reply of the comment : 

export const addComment = async (req, res) => {
  try {
    const { utilisateurId, livreId, commentaire, parentCommentaireId } = req.body;

    // Check if user and book exist
    const user = await User.findById(utilisateurId);
    const livre = await Livre.findById(livreId);
    if (!user || !livre) {
      return res.status(404).json({ message: "Utilisateur ou livre introuvable" });
    }

    let parentComment = null;
    if (parentCommentaireId) {

      // If parent comment ID is provided, check if the parent comment exists
      parentComment = await Comment.findById(parentCommentaireId);
      if (!parentComment) {
        return res.status(404).json({ message: "Commentaire parent introuvable" });
      }
      // Create new comment reply
      const newComment = new Comment({
        utilisateur: utilisateurId,
        livre: livreId,
        commentaire,
        parentCommentaire: parentCommentaireId
      });

      await newComment.save();

      // Add comment to book or parent comment
      parentComment.replies.push(newComment._id);
      await parentComment.save();

      livre.commentaire.push(newComment._id);
      await livre.save();


      res.status(201).json(newComment);
      return
    }


    // Create new comment
    const newComment = new Comment({
      utilisateur: utilisateurId,
      livre: livreId,
      commentaire,

    });
    await newComment.save();

    // Add comment to book 
    livre.commentaire.push(newComment._id);
    await livre.save();


    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: "Une erreur est survenue" });
  }
}
// get specific comment

export const getCommentById = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentaireId);

    if (!comment) {
      return res.status(404).json({ message: 'comment not found' });
    }
    res.status(200).json(comment);
  } catch (error) {
    res.status(500).json({ message: 'something went wrong' });
  }
};

// update comment

export const updateComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentaireId);
    if (!comment) {
      return res.status(404).json({ message: 'comment not found' });
    }
    comment.commentaire = req.body.commentaire;
    await comment.save();
    res.status(200).json(comment);
  } catch (error) {
    res.status(500).json({ message: 'something went wrong' });
  }
};

//delete comment

export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'comment not found' });
    }
    await comment.remove();

    // remove comment id from livre's comments array
    const livre = await Livre.findById(comment.livre);
    livre.comments = livre.comments.filter(id => id.toString() !== req.params.commentId);
    await livre.save();

    res.status(200).json({ message: 'comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'something went wrong' });
  }
};

// view libary statistics

export const getLibraryStatistics = async (req, res) => {
  try {
    const loans = await LivreEmprunte.find();
    const books = await Livre.find();

    const loanCount = loans.length;
    const bookCount = books.length;

    let mostBorrowedBook = { id: null, count: 0 };
    const bookCounts = {};

    for (const loan of loans) {
      const bookId = loan.livre;
      if (bookId in bookCounts) {
        bookCounts[bookId]++;
      } else {
        bookCounts[bookId] = 1;
      }

      if (bookCounts[bookId] > mostBorrowedBook.count) {
        mostBorrowedBook = { id: bookId, count: bookCounts[bookId] };
      }
    }

    const statistics = {
      loanCount,
      bookCount,
      mostBorrowedBook,
      bookCounts
    };

    res.status(200).json(statistics);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};