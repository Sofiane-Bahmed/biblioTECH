import express from "express"

import {
       addBook,
       searchBooks,
       addComment,
       getCommentById,
       updateComment,
       deleteComment,
       getLibraryStatistics
} from "../cotrollers/book.js"

export const bookRouter = express.Router()

bookRouter.post("/book", addBook);
bookRouter.get("/filter", searchBooks);
bookRouter.post("/comment", addComment);
bookRouter.get("/comment/:id", getCommentById);
bookRouter.put("/comment/:id", updateComment);
bookRouter.delete("/comment/:id", deleteComment);
bookRouter.get("/statistics", getLibraryStatistics);



