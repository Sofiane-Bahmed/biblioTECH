import express from "express";

import { getLibraryStatistics } from "../../controllers/admin/analytics.js";
 
export const statisticsRouter = express.Router();

statisticsRouter.get("/", getLibraryStatistics);