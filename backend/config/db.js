import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User.js";

const connectDB = async () => {
    try {
        mongoose.connection.on("disconnected", () => {
            console.warn("⚠️ MongoDB disconnected.");
        });
        mongoose.connection.on("error", (err) => {
            console.error("❌ MongoDB connection error:", err.message);
        });

        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
        });

        console.log("✅ MongoDB Connected");

        // Seed default admin if none exists
        const adminEmail = (process.env.ADMIN_EMAIL || "admin@skillsync.com").toLowerCase();
        const existingAdmin = await User.findOne({ role: "ADMIN" });
        if (!existingAdmin) {
            const adminPass = process.env.ADMIN_PASSWORD || "AdminPass123!";
            const hashedPassword = await bcrypt.hash(adminPass, 10);
            await User.create({
                name: "System Admin",
                email: adminEmail,
                password: hashedPassword,
                role: "ADMIN",
            });
            console.log(`✅ Default admin initialized: ${adminEmail}`);
        }
    } catch (error) {
        console.error("❌ MongoDB Connection Failure:", error.message);
        if (error.message.includes("whitelist") || error.message.includes("SSL alert number 80")) {
            console.error("👉 Please ensure your IP address is whitelisted in MongoDB Atlas: https://cloud.mongodb.com/");
        }
    }
};

export default connectDB;