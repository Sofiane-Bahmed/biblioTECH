import { Response } from "express";

import asyncHandler from "../../utils/async-handler.js";
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
import {
    addCommentService,
    deleteCommentService,
    getBookCommentsService,
    getCommentService,
    updateCommentService
} from "../../services/comment-services.js";
import { AuthenticatedRequest } from "../../types/auth.js";

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

    const result = await getBookCommentsService({
        bookId,
        req,
    });

    res.status(result.code).json(result);
});




