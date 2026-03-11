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

bookRouter.post("/book", addBook);
bookRouter.get("/getBooks", getAllBooks)
bookRouter.get("/getBook/:id", getBook)
bookRouter.put("/updateBook/:id", updateBook)
bookRouter.delete("/deleteBook/:id", deleteBook)
bookRouter.get("/filter", searchBooks);
bookRouter.get("/statistics", getLibraryStatistics);



