import mongoose from "mongoose";

import { Book } from "../../models/book.js";
import { Comment } from "../../models/comment.js";
import { User } from "../../models/user.js";
import { getPaginatedData } from "../../utils/paginate.js";

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

export const updateCommentService = async ({
    commentId,
    comment,
    userId,
}) => {
    // 1. Validate required content payload
    if (!comment || !comment.trim()) {
        return {
            status: false,
            code: 400,
            message: "Comment content is required for updates.",
        };
    }

    // 2. Atomically update comment ensuring user ownership
    const updatedComment = await Comment.findOneAndUpdate(
        {
            _id: commentId,
            user: userId,
        },
        { $set: { comment } },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!updatedComment) {
        return {
            status: false,
            code: 404,
            message: "Comment not found or you are not authorized to edit this resource.",
        };
    }

    return {
        status: true,
        code: 200,
        message: "Comment updated successfully.",
        data: updatedComment,
    };
};

export const deleteCommentService = async ({
    commentId,
    userId,
    userRole,
}) => {
    // 1. Fetch target comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
        return {
            status: false,
            code: 404,
            message: "Comment not found.",
        };
    }

    // 2. Authorization check (Owner or Admin)
    const isOwner = comment.user?.toString() === userId.toString();
    const isAdmin = userRole === "admin";

    if (!isOwner && !isAdmin) {
        return {
            status: false,
            code: 403,
            message: "Unauthorized: You cannot remove this resource.",
        };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const hasReplies = comment.replies && comment.replies.length > 0;

        if (hasReplies) {
            // SCENARIO A: Soft Delete - Scrub sensitive data but preserve tree nodes for children
            await Comment.findByIdAndUpdate(
                commentId,
                {
                    $set: {
                        comment: "This comment has been removed.",
                        isDeleted: true,
                    },
                    $unset: { user: "" },
                },
                { session }
            );
        } else {
            // SCENARIO B: Hard Delete - No children exist, safe to erase completely
            await Comment.findByIdAndDelete(commentId, { session });

            // Unlink references in parallel
            await Promise.all([
                Book.findByIdAndUpdate(
                    comment.book,
                    { $pull: { comments: commentId } },
                    { session }
                ),
                comment.user
                    ? User.findByIdAndUpdate(
                        comment.user,
                        { $pull: { comments: commentId } },
                        { session }
                    )
                    : Promise.resolve(),
                comment.parentComment
                    ? Comment.findByIdAndUpdate(
                        comment.parentComment,
                        { $pull: { replies: commentId } },
                        { session }
                    )
                    : Promise.resolve(),
            ]);
        }

        await session.commitTransaction();
        session.endSession();

        return {
            status: true,
            code: 200,
            message: hasReplies
                ? "Comment masked successfully."
                : "Comment permanently erased from ecosystem.",
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const getBookCommentsService = async ({
    bookId,
    req,
}) => {
    // 1. Verify book existence
    const bookExists = await Book.exists({ _id: bookId });
    if (!bookExists) {
        return {
            status: false,
            code: 404,
            message: "Book not found.",
        };
    }

    // 2. Query paginated root comments
    const result = await getPaginatedData({
        model: Comment,
        query: { book: bookId, parentComment: null },
        req,
        populate: [
            {
                path: "user",
                select: "fullName email",
            },
            {
                path: "replies",
                populate: [
                    {
                        path: "user",
                        select: "fullName",
                    },
                    {
                        path: "replies",
                        populate: {
                            path: "user",
                            select: "fullName",
                        },
                    },
                ],
            },
        ],
    });

    if (!result.data.length) {
        return {
            status: true,
            code: 200,
            message: "No comments found for this book.",
            data: {
                ...result,
                data: [],
            },
        };
    }

    return {
        status: true,
        code: 200,
        message: "Book comments retrieved successfully.",
        data: result,
    };
};