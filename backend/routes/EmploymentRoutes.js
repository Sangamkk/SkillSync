import express from "express";
import {
  createJob,
  getMyJobs,
  deleteJob,
  getAllJobs,
  getJobById,
  applyToJob,
  getApplicants,
  getApplicantDetail,
  createEmploymentOffer,
  getMyOffers,
  acceptOffer,
  rejectOffer,
  getOrganisationEmployees,
  terminateEmployment,
  getStudentApplications,
  getMyEmployment,
  getStudentEmploymentMetadata,
} from "../controllers/EmploymentController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// ─── Organisation: Jobs ───────────────────────────────────────────────────────

router.post(
    "/jobs",
    authenticate,
    authorizeRoles("ORGANISATION"),
    createJob
);

router.get(
    "/jobs/my",
    authenticate,
    authorizeRoles("ORGANISATION"),
    getMyJobs
);

router.delete(
    "/jobs/:jobId",
    authenticate,
    authorizeRoles("ORGANISATION"),
    deleteJob
);

// ─── Student: Jobs ────────────────────────────────────────────────────────────

router.get(
    "/jobs",
    authenticate,
    authorizeRoles("STUDENT"),
    getAllJobs
);

// NOTE: /jobs/my must be before /jobs/:jobId to avoid conflict
router.get(
    "/jobs/:jobId",
    authenticate,
    authorizeRoles("STUDENT"),
    getJobById
);

router.post(
    "/jobs/:jobId/apply",
    authenticate,
    authorizeRoles("STUDENT"),
    applyToJob
);

router.get(
    "/applications/my",
    authenticate,
    authorizeRoles("STUDENT"),
    getStudentApplications
);

// ─── Student: Employment & Offers ─────────────────────────────────────────────

router.get(
    "/my",
    authenticate,
    authorizeRoles("STUDENT"),
    getMyEmployment
);

router.get(
    "/offers",
    authenticate,
    authorizeRoles("STUDENT"),
    getMyOffers
);

router.post(
    "/offers/:offerId/accept",
    authenticate,
    authorizeRoles("STUDENT"),
    acceptOffer
);

router.post(
    "/offers/:offerId/reject",
    authenticate,
    authorizeRoles("STUDENT"),
    rejectOffer
);

// ─── Organisation: Applications & Offers ─────────────────────────────────────

router.get(
    "/jobs/:jobId/applications",
    authenticate,
    authorizeRoles("ORGANISATION"),
    getApplicants
);

router.get(
    "/jobs/:jobId/applications/:applicationId",
    authenticate,
    authorizeRoles("ORGANISATION"),
    getApplicantDetail
);

router.post(
    "/applications/:applicationId/offer",
    authenticate,
    authorizeRoles("ORGANISATION"),
    createEmploymentOffer
);

// ─── Organisation: Employees ──────────────────────────────────────────────────

router.get(
    "/employees",
    authenticate,
    authorizeRoles("ORGANISATION"),
    getOrganisationEmployees
);

router.post(
    "/employees/:offerId/terminate",
    authenticate,
    authorizeRoles("ORGANISATION"),
    terminateEmployment
);

// ─── Organisation: View student employment (for candidate review) ─────────────

router.get(
    "/students/:studentId",
    authenticate,
    authorizeRoles("ORGANISATION"),
    getStudentEmploymentMetadata
);

export default router;