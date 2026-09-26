import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Verify configuration loaded (don't log secrets)
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn("[CLOUDINARY] Warning: Cloudinary credentials may not be configured");
} else {
    console.log("[CLOUDINARY] Configured for cloud:", process.env.CLOUDINARY_CLOUD_NAME);
}

export default cloudinary;