import express, { Router } from "express"

import { getHealthStatus } from "../../controllers/common/health.js"

export const healthRouter: Router = express.Router()

healthRouter.get("/health", getHealthStatus)







