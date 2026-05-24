import multer from "multer";
import { storage } from "../config/cloudinary.js";

// Limit file size to 5MB max
export const uploadBookCover = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
}).single("coverImage"); 