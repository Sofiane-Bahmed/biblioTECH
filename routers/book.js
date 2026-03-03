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

livreRouter.post("/book", addBook);
livreRouter.get("/filter", searchBooks);
livreRouter.post("/comment", addComment);
livreRouter.get("/comment/:id", getCommentById);
livreRouter.put("/comment/:id", updateComment);
livreRouter.delete("/comment/:id", deleteComment);
livreRouter.get("/statistics", getLibraryStatistics);



