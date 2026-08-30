import express from "express";
import cors from "cors";

import authRoutes from "../routes/authRoutes.js";
import studentRoutes from "../routes/student.routes.js";
import certificateRoutes from "../routes/certificate.routes.js";
import organisationRoutes from "../routes/organisation.routes.js";
import employmentRoutes from "../routes/EmploymentRoutes.js";
import mlRoutes from "../routes/ml.routes.js";

const app = express();

app.use(cors({origin:"http://localhost:5173",credentials:true}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/certificate", certificateRoutes);
app.use("/api/organisation", organisationRoutes);
app.use("/api/employment", employmentRoutes);
app.use("/api/ml",mlRoutes);

export default app;