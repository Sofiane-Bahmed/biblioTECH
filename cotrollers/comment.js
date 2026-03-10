import { Book } from "../models/book.js"
import { Comment } from "../models/comment.js"
import { User } from "../models/user.js"

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

        //reply to a comment
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
        };

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