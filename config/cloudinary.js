import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Define standard book cover storage rules
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "library-book-covers",       // The folder name inside Cloudinary drive
        allowed_formats: ["jpg", "jpeg", "png", "webp"],

        // Auto-transformation: Standardizes the book cover aspect ratio automatically
        transformation: [
            { width: 600, height: 900, crop: "fill", gravity: "center" }, // Standard vertical book ratio
            { quality: "auto", fetch_format: "auto" }                     // Auto-compress for performance
        ],
    },
});

export { cloudinary, storage };