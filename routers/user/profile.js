import express from "express";

import {
    getMyProfile,
    updateUser
} from "../../controllers/user/profile.js";
import { validate } from "../../middlewares/validate.js";
import { updateUserSchema } from "../../validations/user-schema.js";

export const profileRouter = express.Router();

profileRouter.get("/me", getMyProfile);
profileRouter.put("/:id", validate(updateUserSchema), updateUser);
