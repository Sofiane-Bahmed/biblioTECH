import { Book } from "../models/book.js"
import { Category } from "../models/category.js";
import { User } from "../models/user.js"
import { BorrowBook } from "../models/borrowBook.js"
import { sendEmailNotification } from "../utils/mailer.js";

// add books :
export const addBook = async (req, res) => {
  try {
    const { title, author, copies_available, category } = req.body;

    // Check if category exists
    const existingCategory = await Category.findOne({ title: category });
    if (!existingCategory) {
      return res.status(400).json({ message: 'Category does not exist' });
    }

    // Create new book
    const newBook = new Book({
      title,
      author,
      copies_available,
      category: existingCategory._id
    });
    await newBook.save();

    // Send email notification to subscribers
    const subscribers = await User.find({ subscribed: true });

    for (const subscriber of subscribers) {
      const subject = 'New Book Added';
      const text = `A new book titled "${title}" by ${author} has been added to the library. Check it out now!`;
      sendEmailNotification(subscriber.email, subject, text);
    }
    res.status(201).json(newBook);

  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};

// read all books : 
export const getAllBooks = async (res) => {
  try {
    const books = await Book.find({ copies_available: { $gt: 0 } }).populate('category', 'title');
    res.status(200).json(books);

  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};

export const getBook = async (res, req) => {
  const { id } = req.params;
  try {
    const book = await Book.findById(id);
    res.status(200).json(book);

  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};

// update a book 
export const updateBook = async (req, res) => {

  const { id } = req.params;
  const { title, author, copies_available, category } = req.body
  try {
    //chek if book exists
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: "book not found" })
    }
    // Check if category exists
    const existingCategory = await Category.findOne({ title: category });
    if (!existingCategory) {
      return res.status(400).json({ message: 'Category does not exist' });
    }

    const updatedBook = new Book({
      title,
      author,
      copies_available,
      category: existingCategory._id
    })

    await updatedBook.save()
    res.status(201).json({ message: "book updated successfully", updatedBook })

  } catch (error) {
    res.status(500).json({ message: "something went wrong" })
  }
}

// delete a book 
export const deleteBook = async (req, res) => {

  const { id } = req.params;
  try {
    const book = await Book.findByIdAndDelete(id);
    if (!book) {
      return res.status(404).json({ message: "book not found" })
    }

    res.status(201).json({ message: "book deleted successfully" })

  } catch (error) {
    res.status(500).json({ message: "something went wrong" })
  }
}

// search books by filtring : 
export const searchBooks = async (req, res) => {
  try {
    const { title, author, category, availableCopies } = req.query;

    let filters = {};

    if (title) {
      filters.title = { $regex: title, $options: 'i' };
    }
    if (author) {
      filters.author = { $regex: author, $options: 'i' };
    }
    if (category) {
      const categoryId = await Category.findOne({ title: category });
      if (categoryId) {
        filters.category = categoryId._id;
      } else {
        return res.status(400).json({ message: 'Category not found' });
      }
    }
    if (availableCopies) {
      filters.available_copies = { $gte: availableCopies };
    }

    const books = await Book.find(filters).populate('category', 'title');
    res.status(200).json(books);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

// view libary statistics
export const getLibraryStatistics = async (res) => {
  try {
    const borrows = await BorrowBook.find();
    const books = await Book.find();

    const borrowCount = borrows.length;
    const bookCount = books.length;

    let mostBorrowedBook = { id: null, count: 0 };
    const bookCounts = {};

    for (const borrow of borrows) {
      const bookId = borrow.book;
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
      borrowCount,
      bookCount,
      mostBorrowedBook,
      bookCounts
    };

    res.status(200).json(statistics);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};