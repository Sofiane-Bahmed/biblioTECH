import express, { Router } from "express"

import {
       addBook,
       updateBook,
       deleteBook,
       autoAddBookByIsbn,
} from "../../controllers/admin/book.js"
import {
       addBookSchema,
       autoImportBookSchema,
       deleteBookSchema,
       updateBookSchema
} from "../../validations/admin/book/book-schema.js";
import { validate } from "../../middlewares/validate.js";
import { uploadBookCover } from "../../middlewares/upload.js";

export const adminBookRouter: Router = express.Router();

adminBookRouter.post("/", uploadBookCover, validate(addBookSchema), addBook);
adminBookRouter.get("/auto-import", validate(autoImportBookSchema), autoAddBookByIsbn);

adminBookRouter.put("/:bookId", uploadBookCover, validate(updateBookSchema), updateBook);
adminBookRouter.delete("/:bookId", validate(deleteBookSchema), deleteBook);







