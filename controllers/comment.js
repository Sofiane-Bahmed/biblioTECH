import { Book } from "../models/book.js"
import { Comment } from "../models/comment.js"
import { User } from "../models/user.js"

//add comment or the reply of the comment : 
export const addComment = async (req, res) => {
    const userId = req.user._id;
    const { bookId, comment, parentCommentId } = req.body;

    try {
        // check if the book exists
        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ message: "Book not found" });

        // Prepare comment data
        const commentData = {
            user: userId,
            book: bookId,
            comment
        };

        // If it's a reply, validate the parent
        if (parentCommentId) {
            const parent = await Comment.findById(parentCommentId);
            if (!parent) return res.status(404).json({ message: "Parent comment not found" });
            commentData.parentComment = parentCommentId;
        }

        //Create the comment (works for both top-level and replies)
        const savedComment = await Comment.create(commentData);

        // Update parent if necessary
        if (parentCommentId) {
            await Comment.findByIdAndUpdate(
                parentCommentId,
                {
                    $push: { replies: savedComment._id }
                });
        }

        // link the comment to the book
        book.comment.push(savedComment._id);
        await book.save();

        res.status(201).json(savedComment);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong" });
    }
};

// get specific comment
export const getCommentById = async (req, res) => {
    try {
        const { id } = req.params
        const comment = await Comment
            .findById(id)
            .populate('user', 'fullName email')
            .populate('book', 'title author')
            .populate({
                path: 'replies',
                populate: { path: 'user', select: 'fullName' } 
            });
        ;

        if (!comment) {
            return res.status(404).json({ message: 'comment not found' });
        }
        res.status(200).json(comment);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'something went wrong' });
    }
};

// update comment
export const updateComment = async (req, res) => {
    try {
        const { commentId } = await req.params;
        const { commentUpdate } = req.body;

        const comment = await Comment.findByIdAndUpdate(
            commentId,
            {
                comment: commentUpdate
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!comment) {
            return res.status(404).json({ message: 'comment not found' });
        }

        res.status(200).json(comment);

    } catch (error) {
        res.status(500).json({ message: 'something went wrong' });
    }
};

//delete comment

export const deleteComment = async (req, res) => {
    try {
        const { commentId } = await req.params

        const comment = await Comment.findByIdAndDelete(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'comment not found' });
        }

        // remove comment id from book's comments array
        const book = await Book.findById(comment.book);
        book.comment = book.comment.filter(id => id.toString() !== commentId);
        await book.save();

        res.status(200).json({ message: 'comment deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'something went wrong' });
    }
};