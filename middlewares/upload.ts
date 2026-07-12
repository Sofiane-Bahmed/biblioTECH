import {
    Request,
    Response,
    NextFunction,
    RequestHandler
} from "express";
import multer from "multer";
import { storage } from "../config/cloudinary.js";

export const uploadBookCover: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const upload = multer({
        storage: storage,
        limits: { fileSize: 5 * 1024 * 1024 },
    }).single("coverImage");

    // Execute upload wrapper logic manually to catch file-size/extension overflow rejections cleanly
    upload(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: `File upload restriction boundary violated: ${err.message}`
            });
        } else if (err) {
            return res.status(500).json({
                success: false,
                message: `An unexpected processing error occurred during upload: ${err.message}`
            });
        }

        next();
    });
};