import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
    createVerificationRequest,
    createProjectVerificationRequest,
    getMyRequests,
    getPendingRequests,
    getOrganisationRequestHistory,
    approveRequest,
    rejectRequest,
    cancelRequest,
} from "../controllers/verificationRequest.controller.js";

const router = express.Router();

// Student: create a certificate verification request
router.post(
    "/",
    authenticate,
    authorizeRoles("STUDENT"),
    createVerificationRequest
);

// Student: create a project verification request
router.post(
    "/project",
    authenticate,
    authorizeRoles("STUDENT"),
    createProjectVerificationRequest
);

// Student: get all their own verification requests
router.get(
    "/my",
    authenticate,
    authorizeRoles("STUDENT"),
    getMyRequests
);

// Organisation: get pending requests assigned to them
router.get(
    "/pending",
    authenticate,
    authorizeRoles("ORGANISATION"),
    getPendingRequests
);

// Organisation: get past request history (Approved, Rejected, etc.)
router.get(
    "/history",
    authenticate,
    authorizeRoles("ORGANISATION"),
    getOrganisationRequestHistory
);

// Organisation: approve a request (triggers blockchain)
router.post(
    "/:id/approve",
    authenticate,
    authorizeRoles("ORGANISATION"),
    approveRequest
);

// Organisation: reject a request (triggers blockchain)
router.post(
    "/:id/reject",
    authenticate,
    authorizeRoles("ORGANISATION"),
    rejectRequest
);

// Student: cancel their own pending request
router.post(
    "/:id/cancel",
    authenticate,
    authorizeRoles("STUDENT"),
    cancelRequest
);

export default router;
