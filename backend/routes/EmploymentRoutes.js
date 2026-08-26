import express from "express";
import {
  createJob,
  getMyJobs,
  deleteJob,
  getAllJobs,
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
  getJobById,
  getMyEmployment,
} from "../controllers/EmploymentController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();
// =====================================================
// Organisation Routes
// =====================================================

// Create a job
router.post(
    "/jobs",
    authenticate,
    authorizeRoles("ORGANISATION"),
    createJob
);


// Get jobs created by the logged-in organisation
router.get(
    "/jobs/my",
    authenticate,
    authorizeRoles("ORGANISATION"),
    getMyJobs
);


// Delete a job
// IMPORTANT: controller/service should verify that
// this job belongs to req.user.userId
router.delete(
    "/jobs/:jobId",
    authenticate,
    authorizeRoles("ORGANISATION"),
    deleteJob
);


// =====================================================
// Student Routes
// =====================================================

// View all available jobs
router.get(
    "/jobs",
    authenticate,
    authorizeRoles("STUDENT"),
    getAllJobs
);

router.get(
    "/jobs/:jobId",
    authenticate,
    authorizeRoles("STUDENT"),
    getJobById
);

// Apply to a job
router.post(
    "/jobs/:jobId/apply",
    authenticate,
    authorizeRoles("STUDENT"),
    applyToJob
);

// View my applications
router.get(
    "/applications/my",
    authenticate,
    authorizeRoles("STUDENT"),
    getStudentApplications
);

router.get(
    "/employment/my",
    authenticate,
    authorizeRoles("STUDENT"),
    getMyEmployment
);

// =====================================================
// Organisation Routes
// =====================================================

// View applications for an organisation's job
// IMPORTANT: verify the job belongs to req.user.userId
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

// Create employment offer
// IMPORTANT: verify the application belongs to
// the logged-in organisation
router.post(
    "/applications/:applicationId/offer",
    authenticate,
    authorizeRoles("ORGANISATION"),
    createEmploymentOffer
);


// View organisation employees
router.get(
    "/employees",
    authenticate,
    authorizeRoles("ORGANISATION"),
    getOrganisationEmployees
);


// Terminate employment
// IMPORTANT: verify the employment belongs to
// the logged-in organisation
router.post(
    "/employees/:offerId/terminate",
    authenticate,
    authorizeRoles("ORGANISATION"),
    terminateEmployment
);


// =====================================================
// Student Routes
// =====================================================

// View offers received by the logged-in student
router.get(
    "/offers",
    authenticate,
    authorizeRoles("STUDENT"),
    getMyOffers
);


// Accept employment offer
// IMPORTANT: verify offer belongs to req.user.userId
router.post(
    "/offers/:offerId/accept",
    authenticate,
    authorizeRoles("STUDENT"),
    acceptOffer
);


// Reject employment offer
// IMPORTANT: verify offer belongs to req.user.userId
router.post(
    "/offers/:offerId/reject",
    authenticate,
    authorizeRoles("STUDENT"),
    rejectOffer
);


export default router;