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
import { addCommentService, deleteCommentService, getCommentService, updateCommentService } from "../../services/comment-services.js";

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

    const result = await getCommentService({ commentId });

    res.status(result.code).json(result);
});

export const updateComment = asyncHandler(async (
    req: AuthenticatedRequest<UpdateCommentParams, UpdateCommentBody, any>,
    res: Response
): Promise<void> => {
    const { commentId } = req.params;
    const { comment } = req.body;
    const userId = req.user!._id;

    const result = await updateCommentService({
        commentId,
        comment,
        userId,
    });

    res.status(result.code).json(result);
});

export const deleteComment = asyncHandler(async (
    req: AuthenticatedRequest<DeleteCommentParams, any, any>,
    res: Response
): Promise<void> => {
    const { commentId } = req.params;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    const result = await deleteCommentService({
        commentId,
        userId,
        userRole,
    });

    res.status(result.code).json(result);
})

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


