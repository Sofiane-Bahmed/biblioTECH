import { Book } from "../models/book.js"
import { Category } from "../models/category.js";
import { Comment } from "../models/book.js"
import { User } from "../models/user.js"
import { BorrowBook } from "../models/borrowBook.js"
import { sendEmailNotification } from "./user.js"

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
    const newBook = new Book({ title, author, copies_available, category: existingCategory._id });
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

// search books by filtring : 

export const searchBooks = async (req, res) => {
  try {
    const { title, author, category, availableCopies } = req.query;

    let filters = {};
    if (title) {
      filters.title = { $regex: title, $options: 'i' };
    }
    if (author) {
      filters.auteur = { $regex: author, $options: 'i' };
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


//add comment and the reply of the comment : 
export const addComment = async (req, res) => {
  try {
    const { userId, bookId, comment, parentCommentId } = req.body;

    // Check if user and book exist
    const user = await User.findById(userId);
    const book = await Book.findById(bookId);
    if (!user || !book) {
      return res.status(404).json({ message: "user or book not found" });
    }

    let parentComment = null;
    if (parentCommentId) {

      // If parent comment ID is provided, check if the parent comment exists
      parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
      // Create new comment reply
      const newCommentReply = new Comment({
        user: userId,
        book: bookId,
        parentComment: parentCommentId,
        comment,
      });

      await newCommentReply.save();

      // Add comment to book or parent comment
      parentComment.replies.push(newComment._id);
      await parentComment.save();

      book.comment.push(newComment._id);
      await book.save();


      res.status(201).json(newComment);
      return
    }


    // Create new comment
    const newComment = new Comment({
      user: userId,
      book: bookId,
      comment,

    });
    await newComment.save();

    // Add comment to book 
    book.comment.push(newComment._id);
    await book.save();


    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
}
// get specific comment

export const getCommentById = async (req, res) => {
  try {
    const { commentId } = await req.params

    const comment = await Comment.findById(commentId);

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
    const { commentId } = await req.params;
    const { commentUpdate } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'comment not found' });
    }

    comment.comment = commentUpdate;
    await comment.save();
    res.status(200).json(comment);

  } catch (error) {
    res.status(500).json({ message: 'something went wrong' });
  }
};

//delete comment

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = await req.params

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'comment not found' });
    }
    await comment.remove();

    // remove comment id from book's comments array
    const book = await Book.findById(comment.book);
    book.comment = book.comment.filter(id => id.toString() !== commentId);
    await book.save();

    res.status(200).json({ message: 'comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'something went wrong' });
  }
};

// view libary statistics

export const getLibraryStatistics = async (req, res) => {
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