import { Response } from "express";

import asyncHandler from "../../utils/async-handler.js";
import { GetCommentsQuery } from "../../validations/user/comment/comment-types.js";
import { AuthenticatedRequest } from "../../types/auth.js";
import { getCommentsService } from "../../services/admin/comment.js";

export const getComments = asyncHandler(async (
    req: AuthenticatedRequest<any, any, GetCommentsQuery>,
    res: Response
): Promise<void> => {
    const { bookId, userId } = req.query;

    const result = await getCommentsService({
        bookId,
        userId,
        req,
    });

    res.status(result.code).json(result);
});