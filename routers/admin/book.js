import express from "express"

import {
       addBook,
       updateBook,
       deleteBook,
       getLibraryStatistics,
} from "../../controllers/admin/book.js"
import {
       addBookSchema,
       deleteBookSchema,
       updateBookSchema
} from "../../validations/book-schema.js";
import { validate } from "../../middlewares/validate.js";
import { uploadBookCover } from "../../middlewares/upload.js";

export const adminBookRouter = express.Router();

adminBookRouter.post("/", uploadBookCover, validate(addBookSchema), addBook);
adminBookRouter.post("/stats", getLibraryStatistics);
adminBookRouter.put("/:id", uploadBookCover, validate(updateBookSchema), updateBook);
adminBookRouter.delete("/:id", validate(deleteBookSchema), deleteBook);







