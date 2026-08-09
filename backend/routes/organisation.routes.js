import express from "express";

import {
    createApplication,
    getPendingApplications,
    approveApplication,
    rejectApplication,
    getVerifiedOrganisations,
    organisationLogin
}
from "../controllers/organisation.controller.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();
router.post("/login",organisationLogin);
router.post("/apply",authenticate,authorizeRoles("admin","organization"),createApplication);
router.get("/pending",authenticate,authorizeRoles("admin"),getPendingApplications);
router.put("/approve",authenticate,authorizeRoles("admin"),approveApplication);
router.put("/reject",authenticate,authorizeRoles("admin"), rejectApplication);
router.get("/verified",authenticate,authorizeRoles("admin","organization","student"),getVerifiedOrganisations);

export default router;