import express, { Router } from "express"

import {
       addBook,
       updateBook,
       deleteBook,
       autoAddBookByIsbn,
} from "../../controllers/librarian/book.js"
import {
       addBookSchema,
       autoImportBookSchema,
       deleteBookSchema,
       updateBookSchema
} from "../../validations/librarian/book/book-schema.js";
import { validate } from "../../middlewares/validate.js";
import { uploadBookCover } from "../../middlewares/upload.js";

export const librarianBookRouter: Router = express.Router();

librarianBookRouter.post("/", uploadBookCover, validate(addBookSchema), addBook);
librarianBookRouter.post("/auto-import", validate(autoImportBookSchema), autoAddBookByIsbn);

librarianBookRouter.put("/:bookId", uploadBookCover, validate(updateBookSchema), updateBook);
librarianBookRouter.delete("/:bookId", validate(deleteBookSchema), deleteBook);







