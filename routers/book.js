import express from "express"

import {
       addBook,
       getAllBooks,
       getBook,
       updateBook,
       deleteBook,
       searchBooks,
       getLibraryStatistics,
} from "../cotrollers/book.js"

export const bookRouter = express.Router()

bookRouter.post("/", addBook);
bookRouter.get("/", getAllBooks)
bookRouter.get("/:id", getBook)
bookRouter.put("/:id", updateBook)
bookRouter.delete("/:id", deleteBook)
bookRouter.get("/search", searchBooks);
bookRouter.get("/stats", getLibraryStatistics);



