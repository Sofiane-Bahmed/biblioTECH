import express from "express"

import { authRouter } from "./auth.js"
import { profileRouter } from "./user/profile.js"
import { adminCategoryRouter } from "./admin/category.js"
import { userBorrowRouter } from "./user/borrow.js"
import { userCommentRouter } from "./user/comment.js"
import { adminBookRouter } from "./admin/book.js"
import { publicBookRouter } from "./book.js"
import { authenticate } from "../middlewares/authenticateMiddleware.js"
import { authorize } from "../middlewares/authorizeMiddleware.js"
import { adminBorrowRouter } from "./admin/borrow.js"
import { adminUserRouter } from "./admin/user.js"

const router = express.Router();

router.use("/auth", authRouter)
router.use("/books", publicBookRouter)

router.use("/user/borrows", authenticate, userBorrowRouter)
router.use("/user/comments", authenticate, userCommentRouter)
router.use("/user/profile", authenticate, profileRouter)

router.use("/admin/users", authenticate, authorize("admin"), adminUserRouter)
router.use("/admin/books", authenticate, authorize("admin"), adminBookRouter)
router.use("/admin/categories", authenticate, authorize("admin"), adminCategoryRouter)
router.use("/admin/borrows", authenticate, authorize("admin"), adminBorrowRouter)

export default router;

