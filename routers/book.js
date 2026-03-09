import express from "express"

import {
       addBook,
       getAllBooks,
       updateBook,
       deleteBook,
       searchBooks,
       addComment,
       getCommentById,
       updateComment,
       deleteComment,
       getLibraryStatistics,
} from "../cotrollers/book.js"

export const bookRouter = express.Router()

bookRouter.post("/book", addBook);
bookRouter.get("/getBooks", getAllBooks)
bookRouter.put("/updateBook/:id", updateBook)
bookRouter.delete("/deleteBook/:id", deleteBook)
bookRouter.get("/filter", searchBooks);
bookRouter.post("/comment", addComment);
bookRouter.get("/comment/:id", getCommentById);
bookRouter.put("/comment/:id", updateComment);
bookRouter.delete("/comment/:id", deleteComment);
bookRouter.get("/statistics", getLibraryStatistics);



