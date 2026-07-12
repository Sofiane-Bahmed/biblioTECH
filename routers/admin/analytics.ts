import express, { Router } from "express";
import { getLibraryStatistics } from "../../controllers/admin/analytics.js";

export const adminstatisticsRouter: Router = express.Router();

adminstatisticsRouter.get("/", getLibraryStatistics);