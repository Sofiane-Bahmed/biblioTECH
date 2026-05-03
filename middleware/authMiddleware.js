import Jwt from "jsonwebtoken"

const { verify } = Jwt;

export const authorize = (requiredRole) => async (req, res, next) => {

    try {
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
    }
    catch (err) {
        // Check if the error is specifically due to expiration
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Access token expired",
                code: "TOKEN_EXPIRED" // Highlighting this for the frontend
            });
        }
        res.status(401).json({ message: "Invalid token" });
    }
};