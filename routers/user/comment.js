import express from "express"

import {
    addComment,
    updateComment,
    deleteComment,
    getBookComments,
    getComment,
} from "../../controllers/user/comment.js"
import { validate } from "../../middlewares/validate.js"
import {
    commentSchema,
    deleteCommentSchema,
    getBookCommentsSchema,
    getCommentSchema,
    updateCommentSchema
} from "../../validations/comment-schema.js";

export const userCommentRouter = express.Router()

userCommentRouter.post("/book/:bookId", validate(commentSchema), addComment);
userCommentRouter.get("/book/:bookId", validate(getBookCommentsSchema), getBookComments);

userCommentRouter.get("/:commentId", validate(getCommentSchema), getComment);
userCommentRouter.put("/:commentId", validate(updateCommentSchema), updateComment);
userCommentRouter.delete("/:commentId", validate(deleteCommentSchema), deleteComment);



