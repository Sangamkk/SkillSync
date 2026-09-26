import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "../routes/authRoutes.js";
import studentRoutes from "../routes/student.routes.js";
import certificateRoutes from "../routes/certificate.routes.js";
import organisationRoutes from "../routes/organisation.routes.js";
import employmentRoutes from "../routes/EmploymentRoutes.js";
import mlRoutes from "../routes/ml.routes.js";
import verificationRequestRoutes from "../routes/verificationRequest.routes.js";
import publicRoutes from "../routes/public.routes.js";
import studentsPublicRoutes from "../routes/studentsPublic.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/certificate", certificateRoutes);
app.use("/api/organisation", organisationRoutes);
app.use("/api/employment", employmentRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/verification-requests", verificationRequestRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/students", studentsPublicRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SkillSync API is running",
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[UNHANDLED ERROR]:", err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error",
  });
});

export default app;