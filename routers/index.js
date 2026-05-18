import express from "express"

import { authRouter } from "./auth.js"
import { userRouter } from "./user.js"
import { categoryRouter } from "./category.js"
import { userBorrowRouter } from "./user/borrow.js"
import { commentRouter } from "./comment.js"
import { adminBookRouter } from "./admin/book.js"
import { publicBookRouter } from "./book.js"
import { authenticate } from "../middlewares/authenticateMiddleware.js"
import { authorize } from "../middlewares/authorizeMiddleware.js"
import { adminBorrowRouter } from "./admin/borrow.js"

const router = express.Router();

router.use("/books", publicBookRouter)

router.use("/user/borrows", authenticate, userBorrowRouter)

router.use("/auth", authRouter)
router.use("/users", userRouter)
router.use("/comments", commentRouter)

router.use("/admin/books", authenticate, authorize("admin"), adminBookRouter)
router.use("/admin/categories", categoryRouter)
router.use("/admin/borrows", authenticate, authorize("admin"), adminBorrowRouter)

export default router;

