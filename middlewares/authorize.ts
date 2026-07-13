import {
    Response,
    NextFunction,
    RequestHandler
} from "express";

import asyncHandler from "../utils/async-handler.js";
import { AuthenticatedRequest, UserRole } from "../types/auth.js";

export const authorize = (requiredRole: UserRole): RequestHandler =>
    asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res
                .status(500)
                .json({
                    success: false,
                    message: "Auth context missing. Authenticate middleware must run first."
                });
        }

        const roles: UserRole[] = ["user", "admin"];

        const userRoleLevel = roles.indexOf(req.user.role);
        const requiredRoleLevel = roles.indexOf(requiredRole);

        if (userRoleLevel < requiredRoleLevel) {
            return res.status(403).json({
                success: false,
                message: "Access forbidden: Insufficient permissions"
            });
        }

        next();
    });