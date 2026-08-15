import { Request, Response } from "express";

import { getLibraryStatisticsService } from "../../services/admin/analytics.js";
import asyncHandler from "../../utils/async-handler.js";

export const getLibraryStatistics = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const result = await getLibraryStatisticsService();

        res.status(result.code).json(result);
    }
);