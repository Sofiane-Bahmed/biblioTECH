import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET } = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.warn("[Warning]: Cloudinary credentials are fully or partially missing from your environment variables.");
}

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME || "",
    api_key: CLOUDINARY_API_KEY || "",
    api_secret: CLOUDINARY_API_SECRET || "",
});

interface CloudinaryParamsInput {
    folder: string;
    allowed_formats: string[];
    transformation: Array<Record<string, string | number>>;
}

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "library-book-covers",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
            { width: 600, height: 900, crop: "fill", gravity: "center" },
            { quality: "auto", fetch_format: "auto" }
        ],
    } as CloudinaryParamsInput,
});

export { cloudinary, storage };