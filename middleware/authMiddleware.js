import Jwt from "jsonwebtoken"

const { verify } = Jwt;

export const authorize = (requiredRole) => async (req, res, next) => {

    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ message: "token not found" });

        const decoded = verify(token, process.env.JWT_SECRET)
        if (decoded.role !== requiredRole) return res.status(403).json({ message: "Unauthorized" })

        req.user = decoded;
        next()
    }
    catch (err) {
        res.status(401).json({ message: "Invalid or expired token" })
    }
};