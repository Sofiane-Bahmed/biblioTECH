import { FilterQuery } from "mongoose";

import {
    Comment,
    IComment
} from "../../models/comment.js";
import { getPaginatedData } from "../../utils/paginate.js";

export const getCommentsService = async ({
    bookId,
    userId,
    req,
}) => {
    const query: FilterQuery<IComment> = {};

    if (bookId) {
        query.book = bookId;
    }

    if (userId) {
        query.user = userId;
    }

    const result = await getPaginatedData({
        model: Comment,
        req,
        query,
        populate: [
            { path: "user", select: "fullName email" },
            { path: "book", select: "title author" },
            {
                path: "replies",
                populate: {
                    path: "user",
                    select: "fullName",
                },
            },
        ],
    });

    if (!result || !result.data || !result.data.length) {
        return {
            status: true,
            code: 200,
            message: "No comments found.",
            data: {
                ...result,
                data: [],
            },
        };
    }

    return {
        status: true,
        code: 200,
        message: "Comments retrieved successfully.",
        data: result,
    };
};