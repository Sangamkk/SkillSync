import express from "express";

import {
    createApplication,
    getPendingApplications,
    approveApplication,
    rejectApplication,
    getVerifiedOrganisations,
    getOrganisationProfile,
} from "../controllers/organisation.controller.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Public — anyone can submit an organisation application
router.post("/apply", createApplication);

// Admin only — list pending applications
router.get(
    "/pending",
    authenticate,
    authorizeRoles("ADMIN"),
    getPendingApplications
);

// Admin only — approve (triggers blockchain registration)
router.put(
    "/approve",
    authenticate,
    authorizeRoles("ADMIN"),
    approveApplication
);

// Admin only — reject
router.put(
    "/reject",
    authenticate,
    authorizeRoles("ADMIN"),
    rejectApplication
);

// Authenticated — get list of verified/approved organisations
router.get(
    "/verified",
    authenticate,
    authorizeRoles("ADMIN", "ORGANISATION", "STUDENT"),
    getVerifiedOrganisations
);

// Organisation — get own profile
router.get(
    "/profile",
    authenticate,
    authorizeRoles("ORGANISATION"),
    getOrganisationProfile
);

export default router;