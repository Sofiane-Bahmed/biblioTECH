import express from "express"

import {
    addComment,
    getCommentById,
    updateComment,
    deleteComment,
    getCommentsByBook,
    getAllComments,
} from "../controllers/comment.js"
import { authorize } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.js"
import {
    commentSchema,
    getAllCommentsSchema,
    getCommentsByBookSchema,
    getCommentsByIdSchema,
    updateCommentSchema
} from "../validations/comment.schema.js";

export const commentRouter = express.Router()

commentRouter.use(authorize("user"));

commentRouter.post("/", validate(commentSchema), addComment);
commentRouter.get("/", validate(getAllCommentsSchema), getAllComments);
commentRouter.get("/book/:id", validate(getCommentsByBookSchema), getCommentsByBook);
commentRouter.get("/:id", validate(getCommentsByIdSchema), getCommentById);
commentRouter.put("/:id",validate(updateCommentSchema), updateComment);
commentRouter.delete("/:id", deleteComment);



