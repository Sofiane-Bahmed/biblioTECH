import express from "express"

import { getComments } from "../../controllers/admin/comment.js";
import { validate } from "../../middlewares/validate.js";
import { getCommentsSchema } from "../../validations/comment-schema.js";

export const adminCommentRouter = express.Router()

adminCommentRouter.get("/", validate(getCommentsSchema), getComments)
