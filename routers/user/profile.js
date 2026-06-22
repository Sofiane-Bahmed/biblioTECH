import express from "express";

import {
    getMyActiveBorrows,
    getMyPendingBorrows,
    getMyProfile,
    getMyRejectedBorrows,
    getMyReturnedBorrows,
    updateProfile
} from "../../controllers/user/profile.js";
import { validate } from "../../middlewares/validate.js";
import { updateProfileSchema } from "../../validations/profile-schema.js";

export const profileRouter = express.Router();

profileRouter.get("/me/borrows/active", getMyActiveBorrows);
profileRouter.get("/me/borrows/pending", getMyPendingBorrows);
profileRouter.get("/me/borrows/rejected", getMyRejectedBorrows);
profileRouter.get("/me/borrows/returned", getMyReturnedBorrows);
profileRouter.get("/me", getMyProfile);
profileRouter.put("/me", validate(updateProfileSchema), updateProfile);
