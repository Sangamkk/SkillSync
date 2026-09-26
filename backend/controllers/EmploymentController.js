import Job from "../models/Job.js";
import Application from "../models/Application.js";
import Employment from "../models/Employment.js";
import User from "../models/User.js";
import OrganisationApplication from "../models/OrganisationApplication.js";
import { employmentManager } from "../blockchain/contracts.js";
import { ethers } from "ethers";
import mongoose from "mongoose";

// ─── Employment type enum (matches Types.EmploymentType) ─────────────────────
const EMPLOYMENT_TYPE = {
  Internship: 0,
  FullTime: 1,
  PartTime: 1,
  Employment: 1,
};

/**
 * Resolve organisation display info from either User or OrganisationApplication.
 */
const resolveOrganisationDisplay = async (organisationRef) => {
  if (!organisationRef) {
    return { _id: null, name: "Organisation", organisationName: "Organisation" };
  }

  const orgId =
    typeof organisationRef === "string"
      ? organisationRef
      : organisationRef.toString();

  const orgApplication = await OrganisationApplication.findById(orgId)
    .select("organisationName email")
    .lean();

  if (orgApplication) {
    return {
      _id: orgApplication._id,
      name: orgApplication.organisationName || "Organisation",
      organisationName: orgApplication.organisationName || "Organisation",
      email: orgApplication.email || "",
    };
  }

  const userOrg = await User.findById(orgId)
    .select("name email organisationName companyName")
    .lean();

  if (userOrg) {
    return {
      _id: userOrg._id,
      name:
        userOrg.name ||
        userOrg.organisationName ||
        userOrg.companyName ||
        "Organisation",
      organisationName:
        userOrg.organisationName || userOrg.name || "Organisation",
      email: userOrg.email || "",
    };
  }

  return { _id: orgId, name: "Organisation", organisationName: "Organisation" };
};

// ─── POST /api/employment/jobs ────────────────────────────────────────────────
export const createJob = async (req, res) => {
  try {
    const organisationId = req.user?.userId || req.user?._id;

    if (!organisationId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated organization not found. Please log in again.",
      });
    }

    const { title, description, requiredSkills, employmentType, location, stipend } =
      req.body;

    if (!title || !description || !employmentType) {
      return res.status(400).json({
        success: false,
        message: "title, description, and employmentType are required.",
      });
    }

    const normalizedSkills = Array.isArray(requiredSkills)
      ? requiredSkills
      : typeof requiredSkills === "string"
      ? requiredSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const job = await Job.create({
      organisation: organisationId,
      title,
      description,
      requiredSkills: normalizedSkills,
      employmentType,
      location: location || "Remote",
      stipend: stipend ?? null,
    });

    return res.status(201).json(job);
  } catch (error) {
    console.error("Create job failed:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create job.",
    });
  }
};

// ─── GET /api/employment/jobs ─────────────────────────────────────────────────
export const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ isActive: true }).lean();

    const jobsWithOrg = await Promise.all(
      jobs.map(async (job) => {
        const organisation = await resolveOrganisationDisplay(job.organisation);
        return { ...job, organisation };
      })
    );

    return res.status(200).json(jobsWithOrg);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/employment/jobs/:jobId ─────────────────────────────────────────
export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId).lean();

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const organisation = await resolveOrganisationDisplay(job.organisation);
    return res.status(200).json({ ...job, organisation });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/employment/jobs/my ─────────────────────────────────────────────
export const getMyJobs = async (req, res) => {
  try {
    const orgId = req.user?.userId || req.user?._id;
    const jobs = await Job.find({ organisation: orgId });
    return res.status(200).json(jobs);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── POST /api/employment/jobs/:jobId/apply ───────────────────────────────────
export const applyToJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const studentId = req.user?.userId || req.user?._id;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (!job.isActive) {
      return res.status(400).json({ message: "This job is no longer active" });
    }

    const existingApplication = await Application.findOne({
      job: jobId,
      student: studentId,
    });

    if (existingApplication) {
      return res.status(400).json({ message: "Already applied to this job" });
    }

    const application = await Application.create({
      job: jobId,
      student: studentId,
      organisation: job.organisation,
      status: "Applied",
    });

    return res.status(201).json(application);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── DELETE /api/employment/jobs/:jobId ───────────────────────────────────────
export const deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const orgId = req.user?.userId || req.user?._id;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.organisation.toString() !== orgId?.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    job.isActive = false;
    await job.save();

    return res.status(200).json({ message: "Job removed" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/employment/applications/my ─────────────────────────────────────
export const getStudentApplications = async (req, res) => {
  try {
    const studentId = req.user?.userId || req.user?._id;
    const applications = await Application.find({ student: studentId })
      .populate("job")
      .lean();

    const resolved = await Promise.all(
      applications.map(async (app) => {
        const organisation = await resolveOrganisationDisplay(app.organisation);
        return { ...app, organisation };
      })
    );

    return res.status(200).json(resolved);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/employment/jobs/:jobId/applications ────────────────────────────
export const getApplicants = async (req, res) => {
  try {
    const { jobId } = req.params;
    const orgId = req.user?.userId || req.user?._id;

    const job = await Job.findOne({ _id: jobId, organisation: orgId });
    if (!job) {
      return res.status(403).json({
        message: "You are not allowed to view applicants for this job.",
      });
    }

    const applicants = await Application.find({
      job: jobId,
      organisation: orgId,
    })
      .populate("student", "name email usn college applicantId")
      .populate("job");

    return res.status(200).json(applicants);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/employment/jobs/:jobId/applications/:applicationId ──────────────
export const getApplicantDetail = async (req, res) => {
  try {
    const { jobId, applicationId } = req.params;
    const orgId = req.user?.userId || req.user?._id;

    const job = await Job.findOne({ _id: jobId, organisation: orgId });
    if (!job) {
      return res.status(403).json({
        message: "You are not allowed to view this applicant.",
      });
    }

    const application = await Application.findOne({
      _id: applicationId,
      job: jobId,
      organisation: orgId,
    })
      .populate("student", "name email usn college applicantId")
      .populate("job");

    if (!application) {
      return res.status(404).json({
        message: "Application not found for this organisation.",
      });
    }

    return res.status(200).json(application);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── POST /api/employment/applications/:applicationId/offer ───────────────────
/**
 * Organisation creates an employment offer.
 * Backend calls EmploymentManager.createOffer on blockchain.
 */
export const createEmploymentOffer = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const orgId = req.user?.userId || req.user?._id;

    const application = await Application.findById(applicationId).populate(
      "student",
      "name applicantId"
    );

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Verify this application belongs to this organisation
    if (application.organisation.toString() !== orgId?.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (application.status !== "Applied") {
      return res.status(400).json({
        message: `Application is already in status: ${application.status}`,
      });
    }

    const student = application.student;
    if (!student?.applicantId) {
      return res.status(400).json({
        message: "Student does not have a blockchain identity",
      });
    }

    // Get organisation blockchain ID
    const org = await OrganisationApplication.findById(orgId);
    if (!org?.organisationId) {
      return res.status(400).json({
        message: "Organisation does not have a blockchain ID",
      });
    }

    // Get job for employment type
    const job = await Job.findById(application.job);
    const employmentTypeEnum = EMPLOYMENT_TYPE[job?.employmentType] ?? 1;

    // Generate employment hash from applicant + org + job
    const employmentHash = ethers.hexlify(ethers.randomBytes(32));

    const offerDeadline = 0; // No deadline by default

    console.log(
      `[BLOCKCHAIN] Creating employment offer — applicant: ${student.applicantId}, org: ${org.organisationId}`
    );

    const transaction = await employmentManager.createOffer(
      employmentHash,
      employmentTypeEnum,
      org.organisationId,
      student.applicantId,
      offerDeadline
    );

    console.log(`[BLOCKCHAIN] createOffer tx submitted: ${transaction.hash}`);

    const receipt = await transaction.wait();
    const blockchainStatus = receipt.status === 1 ? "CONFIRMED" : "FAILED";

    console.log(`[BLOCKCHAIN] createOffer confirmed: ${receipt.hash}, status: ${blockchainStatus}`);

    if (blockchainStatus === "FAILED") {
      throw new Error("Blockchain offer transaction failed");
    }

    // Get the on-chain offer ID from event or counter
    let offerId = null;
    for (const log of receipt.logs || []) {
      try {
        const parsed = employmentManager.interface.parseLog(log);
        if (parsed && (parsed.name === "OfferCreated" || parsed.name === "OfferCreated(uint256,bytes32,bytes32)")) {
          offerId = Number(parsed.args[0] ?? parsed.args.id);
          break;
        }
      } catch {}
    }
    if (!offerId) {
      try {
        const nextId = await employmentManager.nextOfferId();
        offerId = Number(nextId);
      } catch {
        console.warn("[WARNING] Could not read offerId from contract");
      }
    }

    // Update application
    application.status = "Offered";
    application.employmentHash = employmentHash;
    application.offerId = offerId;
    await application.save();

    return res.status(200).json({
      message: "Offer created",
      application,
      txHash: transaction.hash,
      transactionHash: transaction.hash,
      blockchain: {
        transactionHash: transaction.hash,
        blockNumber: receipt.blockNumber,
        offerId,
        employmentHash,
      },
    });
  } catch (error) {
    console.error("Create offer failed:", error.message);
    return res.status(500).json({
      message: error?.shortMessage || error?.reason || error?.message || "Failed to create offer",
    });
  }
};

// ─── GET /api/employment/offers ───────────────────────────────────────────────
export const getMyOffers = async (req, res) => {
  try {
    const studentId = req.user?.userId || req.user?._id;
    const offers = await Application.find({
      student: studentId,
      status: "Offered",
    })
      .populate("job")
      .populate("student")
      .lean();

    const resolved = await Promise.all(
      offers.map(async (offer) => {
        const organisation = await resolveOrganisationDisplay(offer.organisation);
        return { ...offer, organisation };
      })
    );

    return res.status(200).json(resolved);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── POST /api/employment/offers/:offerId/accept ──────────────────────────────
/**
 * Student accepts an employment offer.
 * Backend calls EmploymentManager.acceptOffer on blockchain.
 */
export const acceptOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const studentId = (req.user?.userId || req.user?._id)?.toString();

    let application = null;
    if (offerId && mongoose.Types.ObjectId.isValid(offerId)) {
      application = await Application.findOne({ _id: offerId, student: studentId });
      if (!application) {
        application = await Application.findById(offerId);
      }
    }
    if (!application && !isNaN(Number(offerId))) {
      application = await Application.findOne({ offerId: Number(offerId), student: studentId });
      if (!application) {
        application = await Application.findOne({ offerId: Number(offerId) });
      }
    }

    if (!application) {
      return res.status(404).json({ message: "Offer not found" });
    }

    // Verify the offer is for this student
    const appStudentId = (application.student?._id || application.student)?.toString();
    if (appStudentId !== studentId) {
      return res.status(403).json({ message: "You are not authorized to accept this offer" });
    }

    if (application.status === "Accepted") {
      return res.status(200).json({
        message: "Offer has already been accepted",
        application,
      });
    }

    if (application.status !== "Offered") {
      return res.status(400).json({
        message: `Offer is in status: ${application.status}`,
      });
    }

    // Get student's blockchain ID
    const student = await User.findById(studentId);
    if (!student?.applicantId) {
      return res.status(400).json({
        message: "Student does not have a blockchain identity",
      });
    }

    const onChainOfferId = application.offerId != null ? application.offerId : Number(offerId);

    console.log(
      `[BLOCKCHAIN] Accepting offer ${onChainOfferId} for applicant ${student.applicantId}`
    );

    const transaction = await employmentManager.acceptOffer(
      Number(onChainOfferId),
      student.applicantId
    );

    console.log(`[BLOCKCHAIN] acceptOffer tx submitted: ${transaction.hash}`);

    const receipt = await transaction.wait();
    const blockchainStatus = receipt.status === 1 ? "CONFIRMED" : "FAILED";

    console.log(`[BLOCKCHAIN] acceptOffer confirmed: ${receipt.hash}, status: ${blockchainStatus}`);

    if (blockchainStatus === "FAILED") {
      throw new Error("Blockchain accept offer transaction failed");
    }

    // Create employment record
    const employment = await Employment.create({
      employmentHash: application.employmentHash,
      offerId: application.offerId,
      student: application.student,
      organisation: application.organisation,
      job: application.job,
    });

    application.status = "Accepted";
    await application.save();

    return res.status(200).json({
      message: "Offer accepted",
      employment,
      txHash: transaction.hash,
      transactionHash: transaction.hash,
      blockchain: {
        transactionHash: transaction.hash,
        blockNumber: receipt.blockNumber,
      },
    });
  } catch (error) {
    console.error("Accept offer failed:", error.message);
    return res.status(500).json({
      message: error?.shortMessage || error?.reason || error?.message || "Failed to accept offer",
    });
  }
};

// ─── POST /api/employment/offers/:offerId/reject ──────────────────────────────
/**
 * Student rejects an employment offer.
 * Backend calls EmploymentManager.rejectOffer on blockchain.
 */
export const rejectOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const studentId = (req.user?.userId || req.user?._id)?.toString();

    let application = null;
    if (offerId && mongoose.Types.ObjectId.isValid(offerId)) {
      application = await Application.findOne({ _id: offerId, student: studentId });
      if (!application) {
        application = await Application.findById(offerId);
      }
    }
    if (!application && !isNaN(Number(offerId))) {
      application = await Application.findOne({ offerId: Number(offerId), student: studentId });
      if (!application) {
        application = await Application.findOne({ offerId: Number(offerId) });
      }
    }

    if (!application) {
      return res.status(404).json({ message: "Offer not found" });
    }

    const appStudentId = (application.student?._id || application.student)?.toString();
    if (appStudentId !== studentId) {
      return res.status(403).json({ message: "You are not authorized to reject this offer" });
    }

    const student = await User.findById(studentId);
    if (!student?.applicantId) {
      return res.status(400).json({
        message: "Student does not have a blockchain identity",
      });
    }

    const onChainOfferId = application.offerId != null ? application.offerId : Number(offerId);

    console.log(
      `[BLOCKCHAIN] Rejecting offer ${onChainOfferId} for applicant ${student.applicantId}`
    );

    const transaction = await employmentManager.rejectOffer(
      Number(onChainOfferId),
      student.applicantId
    );

    console.log(`[BLOCKCHAIN] rejectOffer tx submitted: ${transaction.hash}`);

    const receipt = await transaction.wait();

    console.log(`[BLOCKCHAIN] rejectOffer confirmed: ${receipt.hash}`);

    application.status = "Rejected";
    await application.save();

    return res.status(200).json({
      message: "Offer rejected",
      txHash: transaction.hash,
      transactionHash: transaction.hash,
      blockchain: { transactionHash: transaction.hash },
    });
  } catch (error) {
    console.error("Reject offer failed:", error.message);
    return res.status(500).json({
      message: error?.shortMessage || error?.reason || error?.message || "Failed to reject offer",
    });
  }
};

// ─── GET /api/employment/my ───────────────────────────────────────────────────
export const getMyEmployment = async (req, res) => {
  try {
    const studentId = req.user?.userId || req.user?._id;
    const records = await Employment.find({ student: studentId })
      .populate("job")
      .lean();

    const resolved = await Promise.all(
      records.map(async (record) => {
        const organisation = await resolveOrganisationDisplay(record.organisation);
        return { ...record, organisation };
      })
    );

    const currentEmployment = resolved.filter((r) => r.status === "Active");
    const previousEmployment = resolved.filter((r) =>
      ["Completed", "Terminated"].includes(r.status)
    );

    return res.status(200).json({ currentEmployment, previousEmployment });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/employment/students/:studentId ─────────────────────────────────
export const getStudentEmploymentMetadata = async (req, res) => {
  try {
    const { studentId } = req.params;
    const orgId = req.user?.userId || req.user?._id;

    // Verify the student applied to this org
    const application = await Application.findOne({
      student: studentId,
      organisation: orgId,
    })
      .select("_id")
      .lean();

    if (!application) {
      return res.status(403).json({
        message: "You are not allowed to view this candidate's employment.",
      });
    }

    const records = await Employment.find({ student: studentId })
      .populate("job", "title description employmentType location stipend")
      .lean();

    const resolved = await Promise.all(
      records.map(async (record) => {
        const organisation = await resolveOrganisationDisplay(record.organisation);
        return { ...record, organisation };
      })
    );

    const currentEmployment = resolved.filter((r) => r.status === "Active");
    const previousEmployment = resolved.filter((r) =>
      ["Completed", "Terminated"].includes(r.status)
    );

    return res.status(200).json({
      records: resolved,
      currentEmployment,
      previousEmployment,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/employment/employees ───────────────────────────────────────────
export const getOrganisationEmployees = async (req, res) => {
  try {
    const orgId = req.user?.userId || req.user?._id;
    const employees = await Employment.find({ organisation: orgId })
      .populate("student", "name email usn college applicantId")
      .populate("job", "title employmentType");

    return res.status(200).json(employees);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── POST /api/employment/employees/:offerId/terminate ────────────────────────
/**
 * Organisation terminates an employee's employment.
 * Backend calls EmploymentManager.endEmployment on blockchain.
 */
export const terminateEmployment = async (req, res) => {
  try {
    const { offerId } = req.params;
    const orgId = req.user?.userId || req.user?._id;

    // Get organisation blockchain ID
    const org = await OrganisationApplication.findById(orgId);
    if (!org?.organisationId) {
      return res.status(400).json({
        message: "Organisation does not have a blockchain ID",
      });
    }

    let employment = null;
    if (offerId && mongoose.Types.ObjectId.isValid(offerId)) {
      employment = await Employment.findOne({ _id: offerId, organisation: orgId });
      if (!employment) {
        employment = await Employment.findById(offerId);
      }
    }
    if (!employment && !isNaN(Number(offerId))) {
      employment = await Employment.findOne({ offerId: Number(offerId), organisation: orgId });
      if (!employment) {
        employment = await Employment.findOne({ offerId: Number(offerId) });
      }
    }

    if (!employment) {
      return res.status(404).json({ message: "Employment record not found" });
    }

    const empOrgId = (employment.organisation?._id || employment.organisation)?.toString();
    if (empOrgId !== orgId?.toString()) {
      return res.status(403).json({ message: "You are not authorized to terminate this employment" });
    }

    if (employment.status === "Terminated") {
      return res.status(400).json({ message: "Employment is already terminated" });
    }

    const onChainOfferId = employment.offerId != null ? employment.offerId : Number(offerId);

    console.log(
      `[BLOCKCHAIN] Terminating employment ${onChainOfferId} by org ${org.organisationId}`
    );

    const transaction = await employmentManager.endEmployment(
      Number(onChainOfferId),
      org.organisationId
    );

    console.log(`[BLOCKCHAIN] endEmployment tx submitted: ${transaction.hash}`);

    const receipt = await transaction.wait();

    console.log(`[BLOCKCHAIN] endEmployment confirmed: ${receipt.hash}`);

    employment.status = "Terminated";
    await employment.save();

    // Also update Application status if exists
    if (employment.employmentHash) {
      await Application.updateMany(
        { employmentHash: employment.employmentHash },
        { status: "Completed" }
      );
    }

    return res.status(200).json({
      message: "Employment terminated successfully",
      employment,
      txHash: transaction.hash,
      transactionHash: transaction.hash,
      blockchain: {
        transactionHash: transaction.hash,
        blockNumber: receipt.blockNumber,
      },
    });
  } catch (error) {
    console.error("Terminate employment failed:", error.message);
    let message = error?.shortMessage || error?.reason || error?.message || "Failed to terminate employment";
    if (message.includes("UnauthorizedOrganisation")) {
      message = "Blockchain rejected: Organisation did not create this employment offer.";
    } else if (message.includes("EmploymentNotActive")) {
      message = "Blockchain rejected: Employment is not currently active on-chain.";
    } else if (message.includes("EmploymentAlreadyTerminated")) {
      message = "Blockchain rejected: Employment was already terminated.";
    }
    return res.status(500).json({
      message,
    });
  }
};