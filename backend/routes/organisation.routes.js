import express from "express";

import {
    createApplication,
    getPendingApplications,
    approveApplication
}
from "../controllers/organisation.controller.js";

const router = express.Router();

router.post(
    "/apply",
    createApplication
);

router.get(
    "/pending",
    getPendingApplications
);

router.put(
    "/approve",
    approveApplication
);

export default router;