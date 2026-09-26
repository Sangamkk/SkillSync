import VerificationRequest from "../models/VerificationRequest.js";
import Certificate from "../models/Certificate.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import OrganisationApplication from "../models/OrganisationApplication.js";
import { requestManager, applicantManager } from "../blockchain/contracts.js";

// ─── Enum constants (matches Types.sol) ──────────────────────────────────────
const REQUEST_TYPE = {
  AddCertificate: 0,
  RevokeCertificate: 1,
  AddProjectVerification: 2,
  RevokeProjectVerification: 3,
  AddEmployment: 4,
  TerminateEmployment: 5,
};

const CREDENTIAL_TYPE = {
  Certificate: 0,
  Project: 1,
  Internship: 2,
  Hackathon: 3,
  ResearchPaper: 4,
  Patent: 5,
};

// ─── POST /api/verification-requests ──────────────────────────────────────────
/**
 * Student creates a certificate verification request.
 * Submits on-chain createRequest, then saves to MongoDB.
 */
export const createVerificationRequest = async (req, res) => {
  try {
    const studentId = req.user?.userId || req.user?._id;
    const { certificateId, organisationId, notes } = req.body;

    if (!certificateId || !organisationId) {
      return res.status(400).json({
        success: false,
        message: "certificateId and organisationId are required",
        errorCode: "MISSING_FIELDS",
      });
    }

    // Validate certificate belongs to this student
    const certificate = await Certificate.findOne({
      _id: certificateId,
      student: studentId,
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found or does not belong to you",
        errorCode: "CERTIFICATE_NOT_FOUND",
      });
    }

    if (certificate.verificationStatus === "Verified") {
      return res.status(400).json({
        success: false,
        message: "Certificate is already verified",
        errorCode: "ALREADY_VERIFIED",
      });
    }

    // Validate student has blockchain ID
    const student = await User.findById(studentId);
    if (!student?.applicantId) {
      return res.status(400).json({
        success: false,
        message: "Student does not have a blockchain identity. Please re-register.",
        errorCode: "NO_BLOCKCHAIN_ID",
      });
    }

    // Validate organisation is approved and has blockchain ID
    const organisation = await OrganisationApplication.findOne({
      _id: organisationId,
      status: "Approved",
    });

    if (!organisation) {
      return res.status(404).json({
        success: false,
        message: "Organisation not found or not approved",
        errorCode: "ORG_NOT_FOUND",
      });
    }

    if (!organisation.organisationId) {
      return res.status(400).json({
        success: false,
        message: "Organisation does not have a blockchain ID",
        errorCode: "ORG_NO_BLOCKCHAIN_ID",
      });
    }

    // Check for existing pending request
    const existingRequest = await VerificationRequest.findOne({
      certificate: certificateId,
      organisation: organisationId,
      status: "Pending",
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: "A pending verification request already exists for this certificate and organisation",
        errorCode: "REQUEST_ALREADY_EXISTS",
      });
    }

    // Map certificate type to credential type enum
    const certTypeToCredentialType = {
      Internship: CREDENTIAL_TYPE.Internship,
      Hackathon: CREDENTIAL_TYPE.Hackathon,
      ResearchPaper: CREDENTIAL_TYPE.ResearchPaper,
      Patent: CREDENTIAL_TYPE.Patent,
      Course: CREDENTIAL_TYPE.Certificate,
      Workshop: CREDENTIAL_TYPE.Certificate,
      Competition: CREDENTIAL_TYPE.Certificate,
      Professional: CREDENTIAL_TYPE.Certificate,
      Certificate: CREDENTIAL_TYPE.Certificate,
      Other: CREDENTIAL_TYPE.Certificate,
    };

    const credentialType = certTypeToCredentialType[certificate.certificateType] ?? CREDENTIAL_TYPE.Certificate;

    // Calculate expiresAt
    let expiresAt = 0;
    if (certificate.expiryDate) {
      expiresAt = Math.floor(new Date(certificate.expiryDate).getTime() / 1000);
    }

    console.log(
      `[BLOCKCHAIN] Creating request — applicant: ${student.applicantId}, org: ${organisation.organisationId}, hash: ${certificate.certificateHash}`
    );

    // Submit blockchain transaction
    const transaction = await requestManager.createRequest(
      certificate.certificateHash,
      credentialType,
      REQUEST_TYPE.AddCertificate,
      student.applicantId,
      organisation.organisationId,
      expiresAt
    );

    console.log(`[BLOCKCHAIN] createRequest tx submitted: ${transaction.hash}`);

    const receipt = await transaction.wait();
    const blockchainStatus = receipt.status === 1 ? "CONFIRMED" : "FAILED";

    console.log(`[BLOCKCHAIN] createRequest confirmed: ${receipt.hash}, status: ${blockchainStatus}`);

    if (blockchainStatus === "FAILED") {
      throw new Error("Blockchain transaction failed");
    }

    // Get the blockchain request ID from the RequestManager event or counter
    let blockchainRequestId = null;
    for (const log of receipt.logs || []) {
      try {
        const parsed = requestManager.interface.parseLog(log);
        if (parsed && (parsed.name === "RequestCreated" || parsed.name === "RequestCreated(uint256,bytes32)")) {
          blockchainRequestId = Number(parsed.args[0] ?? parsed.args.id);
          break;
        }
      } catch {}
    }
    if (!blockchainRequestId) {
      try {
        const nextId = await requestManager.nextRequestId();
        blockchainRequestId = Number(nextId);
      } catch {
        console.warn("[WARNING] Could not read blockchainRequestId");
      }
    }

    // Save verification request
    const verificationRequest = await VerificationRequest.create({
      student: studentId,
      certificate: certificateId,
      organisation: organisationId,
      requestType: "certificate",
      status: "Pending",
      notes: notes || "",
      credentialHash: certificate.certificateHash,
      blockchainRequestId,
      createTxHash: transaction.hash,
    });

    console.log(`[VERIFICATION REQUEST] Created: ${verificationRequest._id}`);

    return res.status(201).json({
      success: true,
      message: "Verification request submitted successfully",
      request: verificationRequest,
      blockchain: {
        transactionHash: transaction.hash,
        blockNumber: receipt.blockNumber,
        status: blockchainStatus,
        requestId: blockchainRequestId,
      },
    });
  } catch (error) {
    console.error("[VERIFICATION REQUEST CREATE ERROR]:", error.message);
    return res.status(500).json({
      success: false,
      message: error?.shortMessage || error?.reason || error?.message || "Failed to create verification request",
    });
  }
};

// ─── POST /api/verification-requests/project ──────────────────────────────────
/** Student creates a project verification request. */
export const createProjectVerificationRequest = async (req, res) => {
  try {
    const studentId = req.user?.userId || req.user?._id;
    const { projectId, organisationId } = req.body;

    if (!projectId || !organisationId) {
      return res.status(400).json({
        success: false,
        message: "projectId and organisationId are required",
      });
    }

    // Validate project belongs to student
    const project = await Project.findOne({ _id: projectId, student: studentId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or does not belong to you",
      });
    }

    // Validate student blockchain ID
    const student = await User.findById(studentId);
    if (!student?.applicantId) {
      return res.status(400).json({
        success: false,
        message: "Student does not have a blockchain identity",
      });
    }

    // Validate organisation
    const organisation = await OrganisationApplication.findOne({
      _id: organisationId,
      status: "Approved",
    });

    if (!organisation?.organisationId) {
      return res.status(404).json({
        success: false,
        message: "Organisation not found or not active",
      });
    }

    // Check for duplicate pending request
    const existing = await VerificationRequest.findOne({
      project: projectId,
      organisation: organisationId,
      status: "Pending",
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A pending project verification request already exists",
      });
    }

    const rawHash = project.githubHash.startsWith("0x") ? project.githubHash.slice(2) : project.githubHash;
    const projectHashBytes32 = "0x" + rawHash;

    // Ensure the project is registered on-chain in ApplicantManager
    try {
      const onChainProj = await applicantManager.projects(projectHashBytes32);
      if (!onChainProj || !onChainProj.exists) {
        console.log(`[BLOCKCHAIN] Registering project on-chain for applicant: ${student.applicantId}`);
        const addProjTx = await applicantManager.addProject(student.applicantId, projectHashBytes32);
        await addProjTx.wait();
        console.log(`[BLOCKCHAIN] addProject confirmed: ${addProjTx.hash}`);
      }
    } catch (projErr) {
      console.warn("[WARNING] addProject on-chain check/register warning:", projErr.message);
    }

    console.log(
      `[BLOCKCHAIN] Creating project request — applicant: ${student.applicantId}, org: ${organisation.organisationId}`
    );

    const transaction = await requestManager.createRequest(
      projectHashBytes32,
      CREDENTIAL_TYPE.Project,
      REQUEST_TYPE.AddProjectVerification,
      student.applicantId,
      organisation.organisationId,
      0
    );

    console.log(`[BLOCKCHAIN] createRequest (project) tx: ${transaction.hash}`);
    const receipt = await transaction.wait();

    if (receipt.status !== 1) {
      throw new Error("Blockchain transaction failed");
    }

    let blockchainRequestId = null;
    for (const log of receipt.logs || []) {
      try {
        const parsed = requestManager.interface.parseLog(log);
        if (parsed && (parsed.name === "RequestCreated" || parsed.name === "RequestCreated(uint256,bytes32)")) {
          blockchainRequestId = Number(parsed.args[0] ?? parsed.args.id);
          break;
        }
      } catch {}
    }
    if (!blockchainRequestId) {
      try {
        const nextId = await requestManager.nextRequestId();
        blockchainRequestId = Number(nextId);
      } catch {
        console.warn("[WARNING] Could not read blockchainRequestId");
      }
    }

    const verificationRequest = await VerificationRequest.create({
      student: studentId,
      project: projectId,
      organisation: organisationId,
      requestType: "project",
      status: "Pending",
      credentialHash: projectHashBytes32,
      blockchainRequestId,
      createTxHash: transaction.hash,
    });

    return res.status(201).json({
      success: true,
      message: "Project verification request submitted",
      request: verificationRequest,
      blockchain: {
        transactionHash: transaction.hash,
        blockNumber: receipt.blockNumber,
      },
    });
  } catch (error) {
    console.error("[PROJECT VERIFICATION REQUEST ERROR]:", error.message);
    return res.status(500).json({
      success: false,
      message: error?.shortMessage || error?.reason || error?.message || "Failed to create project verification request",
    });
  }
};

// ─── GET /api/verification-requests/my ────────────────────────────────────────
/** Student gets their own verification requests. */
export const getMyRequests = async (req, res) => {
  try {
    const studentId = req.user?.userId || req.user?._id;
    const requests = await VerificationRequest.find({ student: studentId })
      .populate("certificate", "certificateName certificateType certificateHash verificationStatus issuer issueDate certificateURL")
      .populate("organisation", "organisationName organisationType email")
      .populate("project", "projectName projectType githubLink status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      requests: [],
    });
  }
};

// ─── GET /api/verification-requests/pending ───────────────────────────────────
/** Organisation gets verification requests assigned to them. */
export const getPendingRequests = async (req, res) => {
  try {
    const orgId = req.user?.userId || req.user?._id;
    const requests = await VerificationRequest.find({
      organisation: orgId,
      status: "Pending",
    })
      .populate("certificate", "certificateName certificateType certificateHash issuer issueDate expiryDate certificateURL")
      .populate("student", "name email usn college")
      .populate("project", "projectName projectType githubLink githubHash")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      requests: [],
    });
  }
};

// ─── GET /api/verification-requests/history ─────────────────────────────────
/** Organisation gets past verification requests (Approved, Rejected, etc.). */
export const getOrganisationRequestHistory = async (req, res) => {
  try {
    const orgId = req.user?.userId || req.user?._id;
    const { status } = req.query;

    const query = { organisation: orgId };
    if (status && status !== "All") {
      query.status = status;
    } else {
      query.status = { $ne: "Pending" };
    }

    const requests = await VerificationRequest.find(query)
      .populate("certificate", "certificateName certificateType certificateHash issuer issueDate expiryDate certificateURL verificationStatus")
      .populate("student", "name email usn college")
      .populate("project", "projectName projectType githubLink githubHash status")
      .sort({ updatedAt: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      requests: [],
    });
  }
};

// ─── POST /api/verification-requests/:id/approve ──────────────────────────────
/**
 * Organisation approves a verification request.
 * Calls RequestManager.approveRequest on blockchain.
 * On success, updates certificate status to Verified.
 */
export const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user?.userId || req.user?._id;

    const request = await VerificationRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Verification request not found",
        errorCode: "REQUEST_NOT_FOUND",
      });
    }

    // Verify this request belongs to this organisation
    if (request.organisation.toString() !== orgId?.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to approve this request",
        errorCode: "UNAUTHORIZED",
      });
    }

    if (request.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Verification request is no longer pending (status: ${request.status})`,
        errorCode: "REQUEST_NOT_PENDING",
      });
    }

    // Get organisation blockchain ID
    const organisation = await OrganisationApplication.findById(orgId);
    if (!organisation?.organisationId) {
      return res.status(400).json({
        success: false,
        message: "Organisation does not have a blockchain ID",
        errorCode: "ORG_NO_BLOCKCHAIN_ID",
      });
    }

    if (!request.blockchainRequestId) {
      return res.status(400).json({
        success: false,
        message: "Request does not have a blockchain request ID",
        errorCode: "NO_BLOCKCHAIN_REQUEST_ID",
      });
    }

    if (request.requestType === "project" && request.credentialHash) {
      try {
        const onChainProj = await applicantManager.projects(request.credentialHash);
        if (!onChainProj || !onChainProj.exists) {
          const studentDoc = await User.findById(request.student);
          if (studentDoc?.applicantId) {
            console.log(`[BLOCKCHAIN] Pre-registering project on-chain for applicant ${studentDoc.applicantId}`);
            const addProjTx = await applicantManager.addProject(studentDoc.applicantId, request.credentialHash);
            await addProjTx.wait();
          }
        }
      } catch (projErr) {
        console.warn("[WARNING] Project pre-check in approveRequest:", projErr.message);
      }
    }

    console.log(
      `[BLOCKCHAIN] Approving request ${request.blockchainRequestId} by org ${organisation.organisationId}`
    );

    const transaction = await requestManager.approveRequest(
      request.blockchainRequestId,
      organisation.organisationId
    );

    console.log(`[BLOCKCHAIN] approveRequest tx submitted: ${transaction.hash}`);

    const receipt = await transaction.wait();
    const blockchainStatus = receipt.status === 1 ? "CONFIRMED" : "FAILED";

    console.log(`[BLOCKCHAIN] approveRequest confirmed: ${receipt.hash}, status: ${blockchainStatus}`);

    if (blockchainStatus === "FAILED") {
      throw new Error("Blockchain approval transaction failed");
    }

    // Update verification request in MongoDB
    request.status = "Approved";
    request.actionTxHash = transaction.hash;
    request.actionBlockNumber = receipt.blockNumber;
    await request.save();

    // Update the associated certificate or project
    if (request.requestType === "certificate" && request.certificate) {
      await Certificate.findByIdAndUpdate(request.certificate, {
        verificationStatus: "Verified",
        blockchainStored: true,
        txHash: transaction.hash,
        blockchainTxHash: transaction.hash,
        blockchainBlockNumber: receipt.blockNumber,
        blockchainStatus: "CONFIRMED",
        issuingOrganisation: orgId,
      });
      console.log(`[VERIFICATION] Certificate ${request.certificate} marked as Verified`);
    }

    if (request.requestType === "project" && request.project) {
      await Project.findByIdAndUpdate(request.project, {
        status: "APPROVED",
        approvedBy: orgId,
        onChainRegistered: true,
        txHash: transaction.hash,
      });
      console.log(`[VERIFICATION] Project ${request.project} marked as APPROVED`);
    }

    return res.status(200).json({
      success: true,
      message: "Verification request approved successfully",
      request,
      blockchain: {
        transactionHash: transaction.hash,
        blockNumber: receipt.blockNumber,
        status: blockchainStatus,
      },
    });
  } catch (error) {
    console.error("[APPROVE REQUEST ERROR]:", error.message);
    return res.status(500).json({
      success: false,
      message: error?.shortMessage || error?.reason || error?.message || "Failed to approve verification request",
    });
  }
};

// ─── POST /api/verification-requests/:id/reject ───────────────────────────────
/**
 * Organisation rejects a verification request.
 * Calls RequestManager.rejectRequest on blockchain.
 */
export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const orgId = req.user?.userId || req.user?._id;

    const request = await VerificationRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Verification request not found",
      });
    }

    if (request.organisation.toString() !== orgId?.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to reject this request",
      });
    }

    if (request.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Verification request is no longer pending (status: ${request.status})`,
        errorCode: "REQUEST_NOT_PENDING",
      });
    }

    const organisation = await OrganisationApplication.findById(orgId);
    if (!organisation?.organisationId) {
      return res.status(400).json({
        success: false,
        message: "Organisation does not have a blockchain ID",
      });
    }

    if (request.blockchainRequestId) {
      console.log(
        `[BLOCKCHAIN] Rejecting request ${request.blockchainRequestId} by org ${organisation.organisationId}`
      );

      const transaction = await requestManager.rejectRequest(
        request.blockchainRequestId,
        organisation.organisationId
      );

      console.log(`[BLOCKCHAIN] rejectRequest tx submitted: ${transaction.hash}`);

      const receipt = await transaction.wait();

      console.log(`[BLOCKCHAIN] rejectRequest confirmed: ${receipt.hash}`);

      request.actionTxHash = transaction.hash;
      request.actionBlockNumber = receipt.blockNumber;
    }

    request.status = "Rejected";
    request.rejectionReason = reason || "Rejected by organisation";
    await request.save();

    // Update certificate status to Rejected
    if (request.requestType === "certificate" && request.certificate) {
      await Certificate.findByIdAndUpdate(request.certificate, {
        verificationStatus: "Rejected",
        rejectionReason: reason || "Rejected by organisation",
      });
    }

    if (request.requestType === "project" && request.project) {
      await Project.findByIdAndUpdate(request.project, {
        status: "REJECTED",
        rejectionReason: reason || "Rejected by organisation",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification request rejected",
      request,
    });
  } catch (error) {
    console.error("[REJECT REQUEST ERROR]:", error.message);
    return res.status(500).json({
      success: false,
      message: error?.shortMessage || error?.reason || error?.message || "Failed to reject verification request",
    });
  }
};

// ─── POST /api/verification-requests/:id/cancel ───────────────────────────────
/** Student cancels their own pending verification request. */
export const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.userId || req.user?._id;

    const request = await VerificationRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Verification request not found" });
    }

    if (request.student.toString() !== studentId?.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only cancel your own requests",
      });
    }

    if (request.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Request is no longer pending (status: ${request.status})`,
        errorCode: "REQUEST_NOT_PENDING",
      });
    }

    request.status = "Cancelled";
    await request.save();

    return res.status(200).json({
      success: true,
      message: "Verification request cancelled",
      request,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
