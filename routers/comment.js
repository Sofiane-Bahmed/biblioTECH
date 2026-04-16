import express from "express"

import {
    addComment,
    getCommentById,
    updateComment,
    deleteComment,
    getCommentsByBook,
    getAllComments,
} from "../controllers/comment.js"
import { authorize } from "../middleware/authMiddleware.js";

export const commentRouter = express.Router()

commentRouter.post("/", authorize("user"), addComment);
commentRouter.get("/", authorize("user"), getAllComments);
commentRouter.get("/book/:id", authorize("user"), getCommentsByBook);
commentRouter.get("/:id", authorize("user"), getCommentById);
commentRouter.put("/:id", authorize("user"), updateComment);
commentRouter.delete("/:id", authorize("user"), deleteComment);



