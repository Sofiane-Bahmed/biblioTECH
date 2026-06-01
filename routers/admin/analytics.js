import express from "express";

import { getLibraryStatistics } from "../../controllers/admin/analytics.js";

export const adminstatisticsRouter = express.Router();

adminstatisticsRouter.get("/", getLibraryStatistics);