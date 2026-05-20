import Jwt from "jsonwebtoken";
import asyncHandler from "../utils/async-handler.js";

const { verify } = Jwt;

export const authenticate = asyncHandler(async (req, res, next) => {
    const token = req.cookies.accessToken;

    if (!token) {
        return res.status(401).json({ message: "Token not found, login required" });
    }

    try {
        const decoded = verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
});