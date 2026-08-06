import mongoose, { Types } from "mongoose";

import { Book } from "../models/book.js";
import { Comment } from "../models/comment.js";
import { User } from "../models/user.js";

export const addCommentService = async ({
    userId,
    bookId,
    comment,
    parentCommentId,
}) => {
    // 1. Pre-check book existence prior to starting transaction session
    const bookExists = await Book.exists({ _id: bookId });
    if (!bookExists) {
        return {
            status: false,
            code: 404,
            message: "Book not found.",
        };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 2. Verify parent comment existence if this is a nested sub-thread reply
        if (parentCommentId) {
            const parentExists = await Comment.exists({ _id: parentCommentId }).session(session);
            if (!parentExists) {
                await session.abortTransaction();
                session.endSession();
                return {
                    status: false,
                    code: 404,
                    message: "Parent comment not found.",
                };
            }
        }

        const commentData = {
            user: userId,
            book: bookId,
            comment,
            ...(parentCommentId && { parentComment: parentCommentId }),
        };

        // 3. Create comment document inside transaction
        const [savedComment] = await Comment.create([commentData], { session });

        // 4. Update parent relations depending on thread level
        if (parentCommentId) {
            // Nest sub-reply directly under the parent comment
            await Comment.findByIdAndUpdate(
                parentCommentId,
                { $push: { replies: savedComment._id } },
                { session }
            );
        } else {
            // Attach top-level root thread to the book document
            await Book.findByIdAndUpdate(
                bookId,
                { $push: { comments: savedComment._id } },
                { session }
            );
        }

        // 5. Append comment reference to user document
        await User.findByIdAndUpdate(
            userId,
            { $push: { comments: savedComment._id } },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return {
            status: true,
            code: 201,
            message: "Comment posted successfully.",
            data: savedComment,
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const getCommentService = async ({ commentId }) => {
    
    const comment = await Comment.findById(commentId)
        .populate("user", "fullName email")
        .populate("book", "title author")
        .populate({
            path: "replies",
            populate: [
                { path: "user", select: "fullName" },
                {
                    path: "replies", // Deep nesting: Level 3
                    populate: { path: "user", select: "fullName" },
                },
            ],
        });

    if (!comment) {
        return {
            status: false,
            code: 404,
            message: "Comment not found.",
        };
    }

    return {
        status: true,
        code: 200,
        message: "Comment retrieved successfully.",
        data: comment,
    };
};