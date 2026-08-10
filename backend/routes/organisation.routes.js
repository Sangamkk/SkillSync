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
router.post("/apply",createApplication);
router.get("/pending",getPendingApplications);
router.put("/approve",approveApplication);
router.put("/reject",authenticate,authorizeRoles("ADMIN"), rejectApplication);
router.get("/verified",authenticate,authorizeRoles("ADMIN","ORGANIZATION","STUDENT"),getVerifiedOrganisations);

export default router;