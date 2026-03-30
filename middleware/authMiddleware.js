import Jwt from "jsonwebtoken"

const { verify } = Jwt;

export const authorize = (requiredRole) => async (req, res, next) => {

    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ message: "token not found" });

        const decoded = verify(token, process.env.JWT_SECRET)

        // Define the hierarchy
        const roles = ["user", "admin"];
        const userRoleLevel = roles.indexOf(decoded.role);
        const requiredRoleLevel = roles.indexOf(requiredRole);

        // If the user's "clearance level" is lower than required, block them
        if (userRoleLevel < requiredRoleLevel) {
            return res.status(403).json({ message: "Access forbidden: Insufficient permissions" });
        }

        req.user = decoded;
        next()
    }
    catch (err) {
        res.status(401).json({ message: "Invalid or expired token" })
    }
};