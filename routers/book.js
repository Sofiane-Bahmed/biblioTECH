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
import { authorize } from "../middleware/authMiddleware.js";

export const bookRouter = express.Router()

bookRouter.post("/", authorize("admin"), addBook);
bookRouter.get("/", getAllBooks)
bookRouter.get("/:id", getBook)
bookRouter.put("/:id", authorize("admin"), updateBook)
bookRouter.delete("/:id", authorize("admin"), deleteBook)
bookRouter.get("/search", searchBooks);
bookRouter.get("/stats", authorize("admin"), getLibraryStatistics);



