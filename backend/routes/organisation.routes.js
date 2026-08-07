import express from "express";

import {
    createApplication,
    getPendingApplications,
    approveApplication,
    rejectApplication,
    getVerifiedOrganisations
}
from "../controllers/organisation.controller.js";

const router = express.Router();

router.post("/apply",createApplication);

router.get("/pending",getPendingApplications);

router.put("/approve",approveApplication);

router.put("/reject", rejectApplication);

router.get("/verified",getVerifiedOrganisations);

export default router;