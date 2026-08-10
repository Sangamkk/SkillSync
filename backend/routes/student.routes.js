import express from "express";

import { getProfile } from "../controllers/student.controller.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { createProject } from "../controllers/project.Controller.js";

const router = express.Router();
router.get("/profile",authenticate,authorizeRoles("STUDENT"), getProfile);
router.post( "/projects", authenticate, authorizeRoles("STUDENT"), createProject);

export default router;