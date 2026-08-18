import { Request, Response } from "express";

import asyncHandler from "../../utils/async-handler.js";
import { getHealthStatusService } from "../../services/Common/health.js"

export const getHealthStatus = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const result = await getHealthStatusService();

    res.status(result.code).json(result);
  }
);