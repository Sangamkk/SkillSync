import express from "express";

import { getProfile } from "../controllers/student.controller.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
    createProject,
    getPendingProjects,
    getStudentProjects,
    getCandidateProjects,
    updateProjectStatus
} from "../controllers/project.Controller.js";

const router = express.Router();
router.get("/profile", authenticate, authorizeRoles("STUDENT"), getProfile);

router.post("/projects", authenticate, authorizeRoles("STUDENT"), createProject);
router.get("/projects", authenticate, authorizeRoles("STUDENT"), getStudentProjects);
router.get("/candidates/:studentId/projects", authenticate, authorizeRoles("ORGANISATION"), getCandidateProjects);
router.get("/projects/pending", authenticate, authorizeRoles("ORGANISATION", "ADMIN"), getPendingProjects);
router.put("/projects/status", authenticate, authorizeRoles("STUDENT", "ORGANISATION", "ADMIN"), updateProjectStatus);

export default router;