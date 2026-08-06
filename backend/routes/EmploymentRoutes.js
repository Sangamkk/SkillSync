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

const router = express.Router();

// =====================================================
// Organisation Routes
// =====================================================

// TODO: Organisation Auth Middleware Required
router.post("/jobs", createJob);

// TODO: Organisation Auth Middleware Required
router.get("/jobs/my", getMyJobs);

// TODO: Organisation Auth Middleware Required
// TODO: Verify job belongs to req.user.id
router.delete("/jobs/:jobId", deleteJob);

// =====================================================
// Student Routes
// =====================================================

// Public (or Student Auth depending on requirements)
router.get("/jobs", getAllJobs);

// TODO: Student Auth Middleware Required
router.post("/jobs/:jobId/apply", applyToJob);

// =====================================================
// Organisation Routes
// =====================================================

// TODO: Organisation Auth Middleware Required
// TODO: Verify job belongs to req.user.id
router.get("/jobs/:jobId/applications", getApplicants);

// TODO: Organisation Auth Middleware Required
// TODO: Verify application belongs to organisation
router.post(
  "/applications/:applicationId/offer",
  createEmploymentOffer
);

// TODO: Organisation Auth Middleware Required
router.get("/employees", getOrganisationEmployees);

// TODO: Organisation Auth Middleware Required
// TODO: Verify employment belongs to organisation
router.post(
  "/employees/:offerId/terminate",
  terminateEmployment
);

// =====================================================
// Student Routes
// =====================================================

// TODO: Student Auth Middleware Required
router.get("/offers", getMyOffers);

// TODO: Student Auth Middleware Required
// TODO: Verify offer belongs to student
router.post("/offers/:offerId/accept", acceptOffer);

// TODO: Student Auth Middleware Required
// TODO: Verify offer belongs to student
router.post("/offers/:offerId/reject", rejectOffer);

export default router;