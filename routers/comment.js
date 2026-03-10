import express from "express"

import {
    addComment,
    getCommentById,
    updateComment,
    deleteComment,
} from "../cotrollers/comment.js"

export const commentRouter = express.Router()

commentRouter.post("/comment", addComment);
commentRouter.get("/comment/:id", getCommentById);
commentRouter.put("/comment/:id", updateComment);
commentRouter.delete("/comment/:id", deleteComment);



