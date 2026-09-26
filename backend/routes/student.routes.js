import express from "express";

import { getProfile, getFullProfile } from "../controllers/student.controller.js";
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

// ─── Student profile ──────────────────────────────────────────────────────────
router.get(
    "/profile",
    authenticate,
    authorizeRoles("STUDENT"),
    getProfile
);

// Full professional profile (certs + projects + employment)
router.get(
    "/profile/full",
    authenticate,
    authorizeRoles("STUDENT"),
    getFullProfile
);

// ─── Projects ─────────────────────────────────────────────────────────────────
router.post(
    "/projects",
    authenticate,
    authorizeRoles("STUDENT"),
    createProject
);

// NOTE: /projects/pending must come before /projects to avoid route conflict
router.get(
    "/projects/pending",
    authenticate,
    authorizeRoles("ORGANISATION", "ADMIN"),
    getPendingProjects
);

router.get(
    "/projects",
    authenticate,
    authorizeRoles("STUDENT"),
    getStudentProjects
);

router.get(
    "/candidates/:studentId/projects",
    authenticate,
    authorizeRoles("ORGANISATION"),
    getCandidateProjects
);

router.put(
    "/projects/status",
    authenticate,
    authorizeRoles("STUDENT", "ORGANISATION", "ADMIN"),
    updateProjectStatus
);

export default router;