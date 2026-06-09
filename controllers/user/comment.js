import { Book } from "../../models/book.js"
import { Comment } from "../../models/comment.js"
import { User } from "../../models/user.js";

import asyncHandler from "../../utils/async-handler.js";
import { getPaginatedData } from "../../utils/paginate.js";

//add comment or the reply of the comment : 
export const addComment = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const {
        comment,
        parentCommentId
    } = req.body;

    const userId = req.user._id;

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

    // link the comment to book
    book.comments.push(savedComment._id);
    // link the comment to user
    const user = await User.findById(userId);
    user.comments.push(savedComment._id);

    await Promise.all([book.save(), user.save()]);

    res.status(201).json(savedComment);

});

// get specific comment
export const getCommentById = asyncHandler(async (req, res) => {

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

    if (!comment) {
        return res.status(404).json({ message: 'comment not found' });
    }

    res.status(200).json(comment);

});

// update a comment
export const updateComment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { commentUpdate } = req.body;
    const userId = req.user._id;

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

});

export const deleteComment = asyncHandler(async (req, res) => {

    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (comment.user.toString() !== userId.toString() && userRole !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    const childCommentIds = comment.replies || [];

    // Combine all clean-up tasks into one parallel execution
    await Promise.all([
        // Remove parent from Book and User
        Book.findByIdAndUpdate(comment.book, { $pull: { comments: id } }),
        User.findByIdAndUpdate(comment.user, { $pull: { comments: id } }),

        // Remove parent from its own Parent's replies (if it exists)
        comment.parentComment
            ? Comment.findByIdAndUpdate(comment.parentComment, { $pull: { replies: id } })
            : Promise.resolve(),

        // Delete the children from DB 
        Comment.deleteMany({ _id: { $in: childCommentIds } }),

        // Delete the parent itself
        Comment.findByIdAndDelete(id)
    ]);

    res.status(200).json({ message: 'Comment and its replies deleted' })

});

// get all comments of a book
export const getCommentsByBook = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await getPaginatedData({
        model: Comment,
        query: { book: id, parentComment: null },
        req,
        populate: [
            {
                path: 'user',
                select: 'fullName email'
            },
            {
                path: 'replies',
                populate: [
                    {
                        path: 'user',
                        select: 'fullName'
                    },
                    {
                        path: 'replies', // Deep nesting: Level 3
                        populate: {
                            path: 'user',
                            select: 'fullName'
                        }
                    }
                ]
            }
        ]
    })

    if (!result.data.length) {
        return res.status(404).json({ message: 'No comments found for this book' });
    }

    res.status(200).json(result);

});

// get all comments
export const getAllComments = asyncHandler(async (req, res) => {

    const result = await getPaginatedData({
        model: Comment,
        req,
        populate: [
            { path: 'user', select: 'fullName email' },
            { path: 'book', select: 'title author' },
            {
                path: 'replies',
                populate: {
                    path: 'user',
                    select: 'fullName'
                }
            }
        ],
    })

    if (!result.data.length) {
        return res.status(404).json({ message: 'No comments found' });
    }

    res.status(200).json(result);

}); 
