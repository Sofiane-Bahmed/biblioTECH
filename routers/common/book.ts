import express, { Router } from "express"

import {
       getBook,
       getBooks,
       searchBooks,
} from "../../controllers/common/book.js"
import {
       getBookSchema,
       getBooksSchema,
       searchBookSchema,
} from "../../validations/common/book/book-schema.js";
import { validate } from "../../middlewares/validate.js";

export const publicBookRouter: Router = express.Router();

publicBookRouter.get("/", validate(getBooksSchema), getBooks);
publicBookRouter.get("/search", validate(searchBookSchema), searchBooks);
publicBookRouter.get("/:bookId", validate(getBookSchema), getBook);




