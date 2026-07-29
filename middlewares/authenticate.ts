import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import asyncHandler from "../utils/async-handler.js";
import { User } from "../models/user.js";
import { AuthenticatedRequest } from "../types/auth.js";

interface AccessTokenPayload extends jwt.JwtPayload {
    _id: string;
}

export const authenticate = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const token = req.cookies?.accessToken;
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access token missing. Authentication required."
        });
    }

    try {
        const secret = process.env.JWT_ACCESS_SECRET || "";
        if (!secret) {
            throw new Error("JWT_ACCESS_SECRET is undefined inside your environment configuration.");
        }

        const decoded = jwt.verify(token, secret) as AccessTokenPayload;

        const liveUser = await User.findById(decoded._id);

        if (!liveUser) {
            return res.status(401).json({
                success: false,
                message: "User account no longer exists."
            });
        }

        if (liveUser.isBlocked) {
            return res.status(403).json({
                success: false,
                message: "Your account is blocked. Please contact support for more information."
            });
        }

        if (liveUser.suspension_date && liveUser.suspension_date > new Date()) {
            return res.status(403).json({
                success: false,
                message: "Your account is temporarily suspended.",
                until: liveUser.suspension_date
            });
        }

        if (liveUser.outstanding_fines > 10.00) {
            return res.status(403).json({
                success: false,
                message: "`You have $${liveUser.outstanding_fines.toFixed(2)} in outstanding fines. Please settle your account balance.`"
            })
        };

        req.user = {
            _id: liveUser._id.toString(),
            role: liveUser.role
        };

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired session token."
        });
    }
});