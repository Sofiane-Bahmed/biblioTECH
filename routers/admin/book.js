import express from "express"

import {
       addBook,
       updateBook,
       deleteBook,
       getLibraryStatistics,
} from "../../controllers/book.js"
import {
       addBookSchema,
       deleteBookSchema,
       updateBookSchema
} from "../../validations/book.schema.js";
import { validate } from "../../middlewares/validate.js";

export const adminBookRouter = express.Router();

adminBookRouter.post("/", validate(addBookSchema), addBook);
adminBookRouter.post("/stats", getLibraryStatistics);
adminBookRouter.put("/:id", validate(updateBookSchema), updateBook);
adminBookRouter.delete("/:id", validate(deleteBookSchema), deleteBook);







