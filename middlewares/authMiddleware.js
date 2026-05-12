import Jwt from "jsonwebtoken"
import asyncHandler from "../utils/asyncHandler.js";

const { verify } = Jwt;

export const authorize = (requiredRole) => asyncHandler(async (req, res, next) => {

    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "token not found, require login" });

    const decoded = verify(token, process.env.JWT_ACCESS_SECRET)

    // Define the hierarchy
    const roles = ["user", "admin"];
    const userRoleLevel = roles.indexOf(decoded.role);
    const requiredRoleLevel = roles.indexOf(requiredRole);

    if (userRoleLevel < requiredRoleLevel) {
        return res.status(403).json({ message: "Access forbidden: Insufficient permissions" });
    }

    req.user = decoded;
    next()

});

