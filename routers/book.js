import express from "express"

import {
       getBook,
       getBooks,
       searchBooks,
} from "../controllers/book.js"
import {
       getBookSchema,
       getBooksSchema,
       searchBookSchema,
} from "../validations/book-schema.js";
import { validate } from "../middlewares/validate.js";

export const publicBookRouter = express.Router();

publicBookRouter.get("/", validate(getBooksSchema), getBooks);
publicBookRouter.get("/search", validate(searchBookSchema), searchBooks);
publicBookRouter.get("/:id", validate(getBookSchema), getBook);




