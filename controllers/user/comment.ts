import { Response } from "express";
import mongoose from "mongoose";

import { Book } from "../../models/book.js"
import { Comment } from "../../models/comment.js"
import { User } from "../../models/user.js";

import asyncHandler from "../../utils/async-handler.js";
import { getPaginatedData } from "../../utils/paginate.js";
import {
    CreateCommentBody,
    CreateCommentParams,
    DeleteCommentParams,
    GetBookCommentsParams,
    GetBookCommentsQuery,
    GetCommentParams,
    UpdateCommentBody,
    UpdateCommentParams
} from "../../validations/user/comment/comment-types.js";
import { AuthenticatedRequest } from "../../types/auth.js";
import { addCommentService } from "../../services/comment-services.js";

export const addComment = asyncHandler(async (
    req: AuthenticatedRequest<CreateCommentParams, CreateCommentBody, any>,
    res: Response
): Promise<void> => {
    const { bookId } = req.params;
    const { comment, parentCommentId } = req.body;
    const userId = req.user!._id;

    const result = await addCommentService({
        userId,
        bookId,
        comment,
        parentCommentId,
    });

    res.status(result.code).json(result);
});

export const getComment = asyncHandler(async (
    req: AuthenticatedRequest<GetCommentParams, any, any>,
    res: Response
): Promise<void> => {

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
        res.status(404).json({ message: 'comment not found' });
        return;
    }

    res.status(200).json(comment);

});

export const updateComment = asyncHandler(async (
    req: AuthenticatedRequest<UpdateCommentParams, UpdateCommentBody, any>,
    res: Response
): Promise<void> => {

    const { commentId } = req.params;
    const { comment } = req.body;

    const userId = req.user!._id;

    if (!comment) {
        res.status(400).json({ message: "Comment content is required for updates." });
        return;
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
        res.status(404).json({
            message: "Comment not found or you are not authorized to edit this resource."
        });
        return;
    }

    res.status(200).json({
        message: "Comment updated successfully",
        comment: updatedComment
    });
});

export const deleteComment = asyncHandler(async (
    req: AuthenticatedRequest<DeleteCommentParams, any, any>,
    res: Response
): Promise<void> => {

    const { commentId } = req.params;

    const userId = req.user!._id;
    const userRole = req.user!.role;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        res.status(404).json({ message: "Comment not found" })
        return;
    };

    const isOwner = comment.user.toString() === userId.toString();
    const isAdmin = userRole === "admin";

    if (!isOwner && !isAdmin) {
        res.status(403).json({ message: "Unauthorized: You cannot remove this resource." });
        return;
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

        res.status(200).json({
            message: hasReplies ? "Comment masked successfully." : "Comment permanently erased from ecosystem."
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: "Failed to cleanly execute comment deletion pipeline.", error: error.message });
    }
});

export const getBookComments = asyncHandler(async (
    req: AuthenticatedRequest<GetBookCommentsParams, any, GetBookCommentsQuery>,
    res: Response
): Promise<void> => {
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
        res.status(404).json({ message: 'No comments found for this book' });
        return;

    }

    res.status(200).json(result);

});


