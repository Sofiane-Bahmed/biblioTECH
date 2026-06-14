import express from "express"

import { getAllComments } from "../../controllers/admin/comment.js";
import { validate } from "../../middlewares/validate.js";
import { getAllCommentsSchema } from "../../validations/comment-schema.js";

export const adminCommentRouter = express.Router()

adminCommentRouter.get("/", validate(getAllCommentsSchema), getAllComments)
