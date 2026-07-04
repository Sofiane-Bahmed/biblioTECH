import mongoose from "mongoose";

import { Book } from "../../models/book.js"
import { Comment } from "../../models/comment.js"
import { User } from "../../models/user.js";

import asyncHandler from "../../utils/async-handler.js";
import { getPaginatedData } from "../../utils/paginate.js";

export const addComment = asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const { comment, parentCommentId } = req.body;

    const userId = req.user._id;

    const bookExists = await Book.exists({ _id: bookId });
    if (!bookExists) return res.status(404).json({ message: "Book not found" });

    const commentData = {
        user: userId,
        book: bookId,
        comment,
        ...(parentCommentId && { parentComment: parentCommentId })
    };

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // If it's a sub-thread reply, verify structural parent existence inside the session
        if (parentCommentId) {
            const parentExists = await Comment
                .exists({ _id: parentCommentId })
                .session(session);
            if (!parentExists) {
                return res.status(404).json({ message: "Parent comment not found" });
            }
        }

        const [savedComment] = await Comment.create([commentData], { session });

        if (parentCommentId) {
            // Keep sub-replies localized strictly inside their parent node tree path
            await Comment.findByIdAndUpdate(
                parentCommentId,
                { $push: { replies: savedComment._id } },
                { session }
            );
        } else {
            // Only attach top-level root threads directly to the parent book schema
            await Book.findByIdAndUpdate(
                bookId,
                { $push: { comments: savedComment._id } },
                { session }
            );
        }

        await User.findByIdAndUpdate(
            userId,
            { $push: { comments: savedComment._id } },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json(savedComment);

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ message: "Failed to persist comment entry safely.", error: error.message });
    }
});

export const getComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params;
    
    const comment = await Comment
        .findById(commentId)
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

export const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { comment } = req.body;

    const userId = req.user._id;

    if (!comment) {
        return res.status(400).json({ message: "Comment content is required for updates." });
    }

    const updatedComment = await Comment.findOneAndUpdate(
        {
            _id: commentId,
            user: userId
        },
        { $set: { comment } },
        {
            new: true,
            runValidators: true
        }
    );

    if (!updatedComment) {
        return res.status(404).json({
            message: "Comment not found or you are not authorized to edit this resource."
        });
    }

    return res.status(200).json({
        message: "Comment updated successfully",
        comment: updatedComment
    });
});

export const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const userId = req.user._id;
    const userRole = req.user.role;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const isOwner = comment.user.toString() === userId.toString();
    const isAdmin = userRole === "admin";

    if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Unauthorized: You cannot remove this resource." });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const hasReplies = comment.replies && comment.replies.length > 0;

        if (hasReplies) {
            // A. Soft Delete: Scrub sensitive data but preserve tree nodes for children
            await Comment.findByIdAndUpdate(
                commentId,
                {
                    $set: {
                        comment: "This comment has been removed.",
                        isDeleted: true
                    },
                    $unset: { user: "" }
                },
                { session }
            );
        } else {
            // B. Hard Delete: No children exist, safe to erase completely
            await Comment.findByIdAndDelete(commentId, { session });

            // Unlink references in parallel
            await Promise.all([
                Book.findByIdAndUpdate(comment.book, { $pull: { comments: commentId } }, { session }),
                User.findByIdAndUpdate(comment.user, { $pull: { comments: commentId } }, { session }),
                comment.parentComment
                    ? Comment.findByIdAndUpdate(comment.parentComment, { $pull: { replies: commentId } }, { session })
                    : Promise.resolve()
            ]);
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            message: hasReplies ? "Comment masked successfully." : "Comment permanently erased from ecosystem."
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ message: "Failed to cleanly execute comment deletion pipeline.", error: error.message });
    }
});

export const getBookComments = asyncHandler(async (req, res) => {
    const { bookId } = req.params;

    const result = await getPaginatedData({
        model: Comment,
        query: { book: bookId, parentComment: null },
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


