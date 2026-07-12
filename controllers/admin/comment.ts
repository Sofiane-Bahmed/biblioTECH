import { Request, Response } from "express";

import { Comment } from "../../models/comment.js";

import asyncHandler from "../../utils/async-handler.js";
import { getPaginatedData } from "../../utils/paginate.js";
import { GetCommentsQuery } from "../../validations/user/comment/comment-types.js";
import { AuthenticatedRequest } from "../../types/auth.js";

export const getComments = asyncHandler(async (
    req: AuthenticatedRequest<any, any, GetCommentsQuery>,
    res: Response
): Promise<void> => {

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
        res.status(404).json({ message: 'No comments found' });
        return;
    }

    res.status(200).json(result);

}); 