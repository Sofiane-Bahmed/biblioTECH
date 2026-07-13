import express, { Router } from "express";

import {
    getMyBorrows,
    getMyProfile,
    updateMyProfile,
} from "../../controllers/user/profile.js";
import { validate } from "../../middlewares/validate.js";
import {
    getMyBorrowsQuerySchema,
    updateMyProfileSchema,
} from "../../validations/user/profile/profile-schema.js";

export const profileRouter: Router = express.Router();

profileRouter.get("/", getMyProfile);
profileRouter.put("/update-me", validate(updateMyProfileSchema), updateMyProfile);

profileRouter.get("/borrows", validate(getMyBorrowsQuerySchema), getMyBorrows);