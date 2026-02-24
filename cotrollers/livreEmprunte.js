import { LivreEmprunte } from "../models/livreEmprunte.js"
import { Livre } from "../models/livre.js"
import { User } from "../models/user.js"

// borrow a book : 

export const borrowBook = async (req, res) => {
  try {
    const { userId, bookId } = req.body;

    // Check if user has already borrowed 3 books this month
    const date = new Date();
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const count = await LivreEmprunte.countDocuments({
      utilisateur: userId,
      date_emprunt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    });

    if (count >= 3) {
      return res
        .status(400)
        .json({ message: "Vous avez déjà emprunté 3 livres ce mois-ci" });
    }

    // Check if book is available
    const book = await Livre.findById(bookId);
    if (!book) {
      return res.status(400).json({ message: "Livre non trouvé" });
    }
    if (book.copies_disponibles <= 0) {
      return res.status(400).json({ message: "Le livre n'est pas disponible" });
    }

    // Create new borrow
    const date_emprunt = new Date();
    const date_echeance = new Date(date_emprunt.getTime() + 7 * 24 * 60 * 60 * 1000); // Due date is 7 days from now
    const newBorrow = new LivreEmprunte({
      utilisateur: userId,
      livre: bookId,
      date_emprunt,
      date_echeance,
    });
    await newBorrow.save();

    // Update book availability
    book.copies_disponibles--;
    await book.save();

    // Check if the book is returned late

    const currentDate = new Date();
    if (currentDate > newBorrow.date_echeance) {
      // Calculate the number of days late
      const daysLate = Math.floor((currentDate - newBorrow.date_echeance) / (1000 * 60 * 60 * 24));
      // Apply the late return penalty
      if (daysLate >= 10) {
        const user = await User.findById(userId);
        if (user) {
          user.suspension_date = new Date(currentDate.getTime() + 10 * 24 * 60 * 60 * 1000); // Suspension date is 10 days from now
          await user.save();
          return res.status(400).json({ message: "Vous avez été suspendu pour 10 jours en raison du retard de retour du livre" });
        }
      }
    }

    res.status(201).json(newBorrow);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

// return book

export const returnBook = async (req, res) => {
  try {
    const { borrowId, bookId } = req.body;

    // Check if borrow exists
    const borrow = await LivreEmprunte.findOne({ utilisateur: borrowId, livre: bookId });
    if (!borrow) {
      return res.status(400).json({ message: 'Emprunt non trouvé' });
    }

    // Update book availability
    const book = await Livre.findOne({ _id: borrow.livre });
    book.copies_disponibles++;
    await book.save();

    // Update borrow return date
    borrow.date_retour = new Date();
    await borrow.save();

    // Check if the book was returned late
    const currentDate = new Date();
    if (currentDate > borrow.date_echeance) {
      // Calculate the number of days late
      const daysLate = Math.floor((currentDate - borrow.date_echeance) / (1000 * 60 * 60 * 24));

      // Apply the late return penalty
      if (daysLate >= 10) {
        const user = await User.findById(borrow.utilisateur);
        if (user) {
          user.suspension_date = new Date(currentDate.getTime() + 10 * 24 * 60 * 60 * 1000); // Suspension date is 10 days from now
          await user.save();
          return res.status(400).json({ message: "Vous avez été suspendu pour 10 jours en raison du retard de retour du livre" });
        }
      }
    }

    res.status(200).json({ message: 'Le livre a été rendu avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};

// Get borrowing history for a user

export const getBorrowingHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const borrowingHistory = await LivreEmprunte.find({ utilisateur: userId });

    res.status(200).json(borrowingHistory);
  } catch (error) {
    res.status(500).json({ message: "something went wrong" })
  }
}

// Renew borrowed book

export const renewBorrowedBook = async (req, res) => {
  try {
    const { borrowId } = req.params;

    // Check if borrow exists
    const existingBorrow = await LivreEmprunte.findById(borrowId);
    if (!existingBorrow) {
      return res.status(404).json({ message: 'Borrow not found' });
    }

    // Check if the borrow has already been renewed
    if (existingBorrow.nb_renewals >= 1) {
      return res.status(400).json({ message: 'The maximum number of renewals has been reached' });
    }

    // Calculate new due date
    const newDueDate = new Date(existingBorrow.date_echeance.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Update borrow
    existingBorrow.date_echeance = newDueDate;
    existingBorrow.nb_renewals += 1;
    await existingBorrow.save();

    res.status(200).json({ message: 'Borrow renewed successfully', borrow: existingBorrow });

  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};

