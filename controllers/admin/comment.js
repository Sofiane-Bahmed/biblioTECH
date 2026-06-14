import { Comment } from "../../models/comment.js";
import asyncHandler from "../../utils/async-handler.js";
import { getPaginatedData } from "../../utils/paginate.js";

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