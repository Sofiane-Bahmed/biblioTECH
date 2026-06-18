import Jwt from "jsonwebtoken";

import asyncHandler from "../utils/async-handler.js";
import { User } from "../models/user.js";

const { verify } = Jwt;

export const authenticate = asyncHandler(async (req, res, next) => {
    console.log(req.headers.cookie)
    const token = req.cookies.accessToken;
    if (!token) {
        return res.status(401).json({ message: "Access token missing. Authentication required." });
    }

    try {
        const decoded = verify(token, process.env.JWT_ACCESS_SECRET);
        const liveUser = await User.findById(decoded._id);

        if (!liveUser) {
            return res.status(401).json({ message: "User account no longer exists." });
        }

        if (liveUser.isBlocked) {
            return res.status(403).json({
                message: "Your account is blocked. Please contact support for more information."
            });
        }

        if (liveUser.suspension_date && liveUser.suspension_date > new Date()) {
            return res.status(403).json({
                message: "Your account is temporarily suspended.",
                until: liveUser.suspension_date
            });
        }

        req.user = liveUser;

        next();
        
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired session token." });
    }
});