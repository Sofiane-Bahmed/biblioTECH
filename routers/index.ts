import express, { Router } from "express";

import { authRouter } from "./common/auth.js";
import { publicBookRouter } from "./common/book.js";

import { profileRouter } from "./user/profile.js";
import { userBorrowRouter } from "./user/borrow.js";
import { userCommentRouter } from "./user/comment.js";

import { librarianBookRouter } from "./librarian/book.js";
import { librarianBorrowRouter } from "./librarian/borrow.js";
import { librarianReservationRouter } from "./librarian/reservation.js";

import { adminUserRouter } from "./admin/user.js";
import { adminCategoryRouter } from "./admin/category.js";
import { adminCommentRouter } from "./admin/comment.js";
import { adminstatisticsRouter } from "./admin/analytics.js";

import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";

const router: Router = express.Router();

// 1. PUBLIC ROUTES
router.use("/auth", authRouter);
router.use("/books", publicBookRouter);

// 2. PATRON / ALL AUTHENTICATED USERS
router.use("/user/profile", authenticate, authorize("user", "librarian", "admin"), profileRouter);
router.use("/user/borrows", authenticate, authorize("user", "librarian", "admin"), userBorrowRouter);
router.use("/user/comments", authenticate, authorize("user", "librarian", "admin"), userCommentRouter);

// 3. LIBRARIAN & ADMIN ROUTES (Staff Desk & Operations)
router.use("/librarian/books", authenticate, authorize("librarian", "admin"), librarianBookRouter);
router.use("/librarian/borrows", authenticate, authorize("librarian", "admin"), librarianBorrowRouter);
router.use("/librarian/reservations", authenticate, authorize("librarian", "admin"), librarianReservationRouter);

// 4. STRICTLY ADMIN ROUTES (System Administration)
router.use("/admin/users", authenticate, authorize("admin"), adminUserRouter);
router.use("/admin/categories", authenticate, authorize("admin"), adminCategoryRouter);
router.use("/admin/comments", authenticate, authorize("admin"), adminCommentRouter);
router.use("/admin/stats", authenticate, authorize("admin"), adminstatisticsRouter);

export default router;