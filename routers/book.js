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
import {
       addBookSchema,
       deleteBookSchema,
       searchBookSchema,
       updateBookSchema
} from "../validations/book.schema.js";
import { validate } from "../middlewares/validate.js";
import { authorize } from "../middlewares/authMiddleware.js";

export const bookRouter = express.Router()

// Admin routes
const adminRoutes = express.Router();
adminRoutes.use(authorize("admin"));

adminRoutes.post("/", validate(addBookSchema), addBook);
adminRoutes.post("/stats", getLibraryStatistics);
adminRoutes.put("/:id", validate(updateBookSchema), updateBook);
adminRoutes.delete("/:id", validate(deleteBookSchema), deleteBook);

bookRouter.use("/admin", adminRoutes);

// User routes
const userRoutes = express.Router();
userRoutes.use(authorize("user"));

userRoutes.get("/", getAllBooks);
userRoutes.get("/search", validate(searchBookSchema), searchBooks);
userRoutes.get("/:id", getBook);

bookRouter.use("/", userRoutes);





