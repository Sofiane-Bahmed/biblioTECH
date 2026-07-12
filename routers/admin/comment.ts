import express, { Router } from "express"

import { getComments } from "../../controllers/admin/comment.js";
import { validate } from "../../middlewares/validate.js";
import { getCommentsSchema } from "../../validations/user/comment/comment-schema.js";

export const adminCommentRouter: Router = express.Router();

adminCommentRouter.get("/", validate(getCommentsSchema), getComments)
