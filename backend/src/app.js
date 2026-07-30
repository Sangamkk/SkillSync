import express from "express";
import cors from "cors";

import authRoutes from "../routes/authRoutes.js";
import studentRoutes from "../routes/student.routes.js";
const app = express();

app.use(cors({origin:"http://localhost:5173",credentials:true}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);

export default app;