import express from "express"

import {
       addBook,
       getAllBooks,
       getBook,
       updateBook,
       deleteBook,
       searchBooks,
       getLibraryStatistics,
} from "../controllers/book.js"
import { authorize } from "../middleware/authMiddleware.js";

export const bookRouter = express.Router()

bookRouter.post("/", authorize("admin"), addBook);
bookRouter.get("/", getAllBooks)
bookRouter.get("/search", searchBooks);
bookRouter.get("/stats", authorize("admin"), getLibraryStatistics);
bookRouter.get("/:id", getBook)
bookRouter.patch("/:id", authorize("admin"), updateBook)
bookRouter.delete("/:id", authorize("admin"), deleteBook)



