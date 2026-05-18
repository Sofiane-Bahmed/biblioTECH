import express from "express"

import { authRouter } from "./auth.js"
import { userRouter } from "./user.js"
import { categoryRouter } from "./category.js"
import { borrowBookRouter } from "./borrow.js"
import { commentRouter } from "./comment.js"
import { adminBookRouter } from "./admin/book.js"
import { publicBookRouter } from "./book.js"

const router = express.Router();

router.use("/auth", authRouter)
router.use("/books", publicBookRouter)
router.use("/users", userRouter)
router.use("/borrows", borrowBookRouter)
router.use("/comments", commentRouter)

router.use("/admin/categories", categoryRouter)
router.use("/admin/books", adminBookRouter)

export default router;

