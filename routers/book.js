import express from "express"

import {
       getAllBooks,
       getBook,
       searchBooks,
} from "../controllers/book.js"
import {
       getAllBooksSchema,
       getBookSchema,
       searchBookSchema,
} from "../validations/book.schema.js";
import { validate } from "../middlewares/validate.js";

export const publicBookRouter = express.Router();

publicBookRouter.get("/", validate(getAllBooksSchema), getAllBooks);
publicBookRouter.get("/search", validate(searchBookSchema), searchBooks);
publicBookRouter.get("/:id", validate(getBookSchema), getBook);




