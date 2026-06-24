import express from "express";

import {
    getMyBorrows,
    getMyProfile,
    updateProfile
} from "../../controllers/user/profile.js";
import { validate } from "../../middlewares/validate.js";
import {
    getMyBorrowsQuerySchema,
    updateProfileSchema
} from "../../validations/profile-schema.js";

export const profileRouter = express.Router();

profileRouter.get("/me", getMyProfile);
profileRouter.put("/me/update-me", validate(updateProfileSchema), updateProfile);

profileRouter.get("/me/borrows", validate(getMyBorrowsQuerySchema), getMyBorrows);