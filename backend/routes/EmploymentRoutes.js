import express from "express";
import {
  createJob,
  getMyJobs,
  deleteJob,
  getAllJobs,
  applyToJob,
  getApplicants,
  createEmploymentOffer,
  getMyOffers,
  acceptOffer,
  rejectOffer,
  getOrganisationEmployees,
  terminateEmployment,
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
    authorizeRoles("organization"),
    createJob
);


// Get jobs created by the logged-in organisation
router.get(
    "/jobs/my",
    authenticate,
    authorizeRoles("organization"),
    getMyJobs
);


// Delete a job
// IMPORTANT: controller/service should verify that
// this job belongs to req.user.userId
router.delete(
    "/jobs/:jobId",
    authenticate,
    authorizeRoles("organization"),
    deleteJob
);


// =====================================================
// Student Routes
// =====================================================

// View all available jobs
router.get(
    "/jobs",
    authenticate,
    authorizeRoles("student"),
    getAllJobs
);


// Apply to a job
router.post(
    "/jobs/:jobId/apply",
    authenticate,
    authorizeRoles("student"),
    applyToJob
);


// =====================================================
// Organisation Routes
// =====================================================

// View applications for an organisation's job
// IMPORTANT: verify the job belongs to req.user.userId
router.get(
    "/jobs/:jobId/applications",
    authenticate,
    authorizeRoles("organization"),
    getApplicants
);


// Create employment offer
// IMPORTANT: verify the application belongs to
// the logged-in organisation
router.post(
    "/applications/:applicationId/offer",
    authenticate,
    authorizeRoles("organization"),
    createEmploymentOffer
);


// View organisation employees
router.get(
    "/employees",
    authenticate,
    authorizeRoles("organization"),
    getOrganisationEmployees
);


// Terminate employment
// IMPORTANT: verify the employment belongs to
// the logged-in organisation
router.post(
    "/employees/:offerId/terminate",
    authenticate,
    authorizeRoles("organization"),
    terminateEmployment
);


// =====================================================
// Student Routes
// =====================================================

// View offers received by the logged-in student
router.get(
    "/offers",
    authenticate,
    authorizeRoles("student"),
    getMyOffers
);


// Accept employment offer
// IMPORTANT: verify offer belongs to req.user.userId
router.post(
    "/offers/:offerId/accept",
    authenticate,
    authorizeRoles("student"),
    acceptOffer
);


// Reject employment offer
// IMPORTANT: verify offer belongs to req.user.userId
router.post(
    "/offers/:offerId/reject",
    authenticate,
    authorizeRoles("student"),
    rejectOffer
);


export default router;