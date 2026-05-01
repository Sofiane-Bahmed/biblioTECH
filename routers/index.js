import express from "express"

import { authRouter } from "./auth.js"
import { userRouter } from "./user.js"
import { categoryRouter } from "./category.js"
import { bookRouter } from "./book.js"
import { borrowBookRouter } from "./borrow.js"
import { commentRouter } from "./comment.js"

const router = express.Router();

router.use("/auth", authRouter)
router.use("/users", userRouter)
router.use("/categories", categoryRouter)
router.use("/books", bookRouter)
router.use("/borrows", borrowBookRouter)
router.use("/comments", commentRouter)

export default router;

