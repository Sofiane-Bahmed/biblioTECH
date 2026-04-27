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

// Admin routes
const adminRoutes = express.Router();
adminRoutes.use(authorize("admin"));

adminRoutes.post("/", addBook);
adminRoutes.post("/stats", getLibraryStatistics);
adminRoutes.put("/:id", updateBook);
adminRoutes.delete("/:id", deleteBook);

bookRouter.use("/admin", adminRoutes);

// User routes
const userRoutes = express.Router();
userRoutes.use(authorize("user"));

userRoutes.get("/", getAllBooks);
userRoutes.get("/search", searchBooks);
userRoutes.get("/:id", getBook);

bookRouter.use("/", userRoutes);





