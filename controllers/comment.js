import { Book } from "../models/book.js"
import { Comment } from "../models/comment.js"
import { User } from "../models/user.js";

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
        //link the comment to user
        const user = await User.findById(userId);
        user.comments.push(savedComment._id);

        await Promise.all([book.save(), user.save()]);

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
                populate: [
                    { path: 'user', select: 'fullName' },
                    {
                        path: 'replies', // Deep nesting: Level 3
                        populate: { path: 'user', select: 'fullName' }
                    }
                ]
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

// update a comment
export const updateComment = async (req, res) => {
    const { id } = req.params;
    const { commentUpdate } = req.body;
    const userId = req.user._id;

    try {
        const comment = await Comment.findById(id);
        if (!comment) {
            return res.status(404).json({ message: 'comment not found' });
        }
        if (comment.user.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "FORBIDDEN: You can only edit your own comments"
            })
        }

        comment.comment = commentUpdate;
        await comment.save();

        res.status(200).json({
            message: 'Comment updated successfully',
            comment
        });

    } catch (error) {
        res.status(500).json({ message: 'something went wrong' });
    }
};

//delete a comment 
export const deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        const comment = await Comment.findById(id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Owner or Admin only
        if (comment.user.toString() !== userId.toString() && userRole !== 'admin') {
            return res.status(403).json({ message: 'You are not authorized to delete this comment' });
        }

        // Remove the ID from the Book's array
        await Book.findByIdAndUpdate(comment.book, {
            $pull: { comment: id }
        });

        // If it's a reply, remove it from the parent's replies array 
        if (comment.parentComment) {
            await Comment.findByIdAndUpdate(comment.parentComment, {
                $pull: { replies: id }
            });
        }

        // Delete the actual comment
        await Comment.findByIdAndDelete(id);

        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
};

// get all comments of a book
export const getCommentsByBook = async (req, res) => {
    const { id } = req.params;
    try {
        const comments = await Comment.find({ book: id, parentComment: null })
            .sort({ date: -1 })
            .populate('user', 'fullName email')
            .populate({
                path: 'replies',
                populate: [
                    { path: 'user', select: 'fullName' },
                    {
                        path: 'replies', // Deep nesting: Level 3
                        populate: { path: 'user', select: 'fullName' }
                    }
                ]
            });

        if (!comments.length) {
            return res.status(200).json([]);
        }

        res.status(200).json(comments);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
}

// get all comments
export const getAllComments = async (req, res) => {
    try {
        const comments = await Comment.find()
            .populate('user', 'fullName email')
            .populate('book', 'title author')
            .populate({ path: 'replies', populate: { path: 'user', select: 'fullName' } });

        if (!comments.length) {
            return res.status(404).json({ message: 'No comments found' });
        }
        res.status(200).json(comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
};
