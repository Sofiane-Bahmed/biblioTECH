import express from "express"

import {
    addComment,
    getCommentById,
    updateComment,
    deleteComment,
    getBookComments,
} from "../../controllers/user/comment.js"
import { validate } from "../../middlewares/validate.js"
import {
    commentSchema,
    deleteCommentSchema,
    getBookCommentsSchema,
    getCommentsByIdSchema,
    updateCommentSchema
} from "../../validations/comment-schema.js";

export const userCommentRouter = express.Router()

userCommentRouter.post("/book/:bookId", validate(commentSchema), addComment);
userCommentRouter.get("/book/:id", validate(getBookCommentsSchema), getBookComments);
userCommentRouter.get("/:id", validate(getCommentsByIdSchema), getCommentById);
userCommentRouter.put("/:id", validate(updateCommentSchema), updateComment);
userCommentRouter.delete("/:id", validate(deleteCommentSchema), deleteComment);



