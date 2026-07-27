import {
    Response,
    NextFunction,
    RequestHandler
} from "express";
import { AuthenticatedRequest, UserRole } from "../types/auth.js";

export const authorize = (...allowedRoles: UserRole[]): RequestHandler => {
    return (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => {
        if (!req.user) {
            return res.status(500).json({
                success: false,
                message: "Auth context missing. Authenticate middleware must run first.",
            });
        }

        // Check if user's role is in the list of allowed roles for this endpoint
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access forbidden: Insufficient permissions.",
            });
        }

        next();
    };
};