import express from "express"

import {
    addComment,
    getCommentById,
    updateComment,
    deleteComment,
} from "../controllers/comment.js"

export const commentRouter = express.Router()

commentRouter.post("/", addComment);
commentRouter.get("/:id", getCommentById);
commentRouter.put("/:id", updateComment);
commentRouter.delete("/:id", deleteComment);



