import asyncHandler from "../utils/asyncHandler.js";

export const authorize = (requiredRole) => asyncHandler(async (req, res, next) => {
    if (!req.user) {
        return res
            .status(500)
            .json({ message: "Auth context missing. Authenticate middleware must run first." });
    }

    const roles = ["user", "admin"];
    const userRoleLevel = roles.indexOf(req.user.role);
    const requiredRoleLevel = roles.indexOf(requiredRole);

    if (userRoleLevel < requiredRoleLevel) {
        return res.status(403).json({ message: "Access forbidden: Insufficient permissions" });
    }

    next();
});