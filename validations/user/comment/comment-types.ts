import z from "zod";
import {
    commentSchema,
    deleteCommentSchema,
    getBookCommentsSchema,
    getCommentSchema,
    getCommentsSchema,
    updateCommentSchema
} from "./comment-schema.js";

export type CreateCommentRequest = z.infer<typeof commentSchema>;
export type CreateCommentParams = CreateCommentRequest["params"];
export type CreateCommentBody = CreateCommentRequest["body"];

export type GetCommentsRequest = z.infer<typeof getCommentsSchema>;
export type GetCommentsQuery = NonNullable<GetCommentsRequest["query"]>;

export type GetBookCommentsRequest = z.infer<typeof getBookCommentsSchema>;
export type GetBookCommentsParams = GetBookCommentsRequest["params"];
export type GetBookCommentsQuery = NonNullable<GetBookCommentsRequest["query"]>;

export type GetCommentRequest = z.infer<typeof getCommentSchema>;
export type GetCommentParams = GetCommentRequest["params"];

export type UpdateCommentRequest = z.infer<typeof updateCommentSchema>;
export type UpdateCommentParams = UpdateCommentRequest["params"];
export type UpdateCommentBody = UpdateCommentRequest["body"];

export type DeleteCommentRequest = z.infer<typeof deleteCommentSchema>;
export type DeleteCommentParams = DeleteCommentRequest["params"];