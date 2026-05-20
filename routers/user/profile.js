import express from "express";

import {
    getMyProfile,
    updateProfile
} from "../../controllers/user/profile.js";
import { validate } from "../../middlewares/validate.js";
import { updateProfileSchema } from "../../validations/profile-schema.js";

export const profileRouter = express.Router();

profileRouter.get("/me", getMyProfile);
profileRouter.put("/:id", validate(updateProfileSchema), updateProfile);
