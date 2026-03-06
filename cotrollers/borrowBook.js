import { BorrowBook } from "../models/borrowBook.js"
import { Book } from "../models/book.js"
import { User } from "../models/user.js"

// borrow a book : 
export const borrowBook = async (req, res) => {
  try {
    const { userId, bookId } = req.body;

    // Check if user has already borrowed 3 books this month 
    const date = new Date();
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const count = await BorrowBook.countDocuments({
      user: userId,
      borrow_date: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    });

    if (count >= 3) {
      return res
        .status(400)
        .json({ message: "You have already borrowed 3 books this month" });
    }

    // Check if book is available
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(400).json({ message: "book not found" });
    }
    if (book.copies_available <= 0) {
      return res.status(400).json({ message: "The book is not available" });
    }

    // Create new borrow
    const borrow_date = new Date();
    const due_date = new Date(borrow_date.getTime() + 7 * 24 * 60 * 60 * 1000); // Due date is 7 days from now

    const newBorrow = new BorrowBook({
      user: userId,
      book: bookId,
      borrow_date,
      due_date,
    });
    await newBorrow.save();

    // Update book availability
    book.copies_available--;
    await book.save();

    // Check if the book is returned late
    const currentDate = new Date();
    if (currentDate > newBorrow.due_date) {
      // Calculate the number of days late
      const daysLate = Math.floor((currentDate - newBorrow.due_date) / (1000 * 60 * 60 * 24));
      // Apply the late return penalty
      if (daysLate >= 10) {
        const user = await User.findById(userId);
        if (user) {
          user.suspension_date = new Date(currentDate.getTime() + 10 * 24 * 60 * 60 * 1000); // Suspension date is 10 days from now
          await user.save();
          return res.status(400).json({ message: "You have been suspended for 10 days due to the late return of the book" });
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
    const borrow = await BorrowBook.findOne({ user: borrowId, book: bookId });
    if (!borrow) {
      return res.status(400).json({ message: 'Loan not found' });
    }

    // Update book availability
    const book = await Book.findOne({ _id: borrow.book });
    book.copies_available++;
    await book.save();

    // Update borrow return date
    borrow.return_date = new Date();
    await borrow.save();

    // Check if the book was returned late
    const currentDate = new Date();
    if (currentDate > borrow.due_date) {
      // Calculate the number of days late
      const daysLate = Math.floor((currentDate - borrow.due_date) / (1000 * 60 * 60 * 24));

      // Apply the late return penalty
      if (daysLate >= 10) {
        const user = await User.findById(borrow.user);
        if (user) {
          user.suspension_date = new Date(currentDate.getTime() + 10 * 24 * 60 * 60 * 1000); // Suspension date is 10 days from now
          await user.save();
          return res.status(400).json({ message: "You have been suspended for 10 days due to the late return of the book" });
        }
      }
    }

    res.status(200).json({ message: 'The book was successfully returned' });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};

// Get borrowing history for a user
export const getBorrowingHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const borrowingHistory = await BorrowBook.find({ user: userId });

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
    const existingBorrow = await BorrowBook.findById(borrowId);
    if (!existingBorrow) {
      return res.status(404).json({ message: 'Borrow not found' });
    }

    // Check if the borrow has already been renewed
    if (existingBorrow.renewed) {
      return res.status(400).json({ message: 'The maximum number of renewals has been reached' });
    }

    // Calculate new due date
    const newDueDate = new Date(existingBorrow.due_date.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Update borrow
    existingBorrow.due_date = newDueDate;
    existingBorrow.renewed = true;
    await existingBorrow.save();

    res.status(200).json({ message: 'Borrow renewed successfully', borrow: existingBorrow });

  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};

