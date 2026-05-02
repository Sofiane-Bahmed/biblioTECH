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

commentRouter.use(authorize("user"));

commentRouter.post("/", addComment);
commentRouter.get("/", getAllComments);
commentRouter.get("/book/:id", getCommentsByBook);
commentRouter.get("/:id", getCommentById);
commentRouter.put("/:id", updateComment);
commentRouter.delete("/:id", deleteComment);



