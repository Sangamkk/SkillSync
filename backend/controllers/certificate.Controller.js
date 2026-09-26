import crypto from "crypto";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import Certificate from "../models/Certificate.js";
import User from "../models/User.js";
import OrganisationApplication from "../models/OrganisationApplication.js";
import Application from "../models/Application.js";
import VerificationRequest from "../models/VerificationRequest.js";
import { uploadToCloudinary } from "../services/cloudinaryService.js";
import { certificateManager } from "../blockchain/contracts.js";
import { getRawPublicId } from "../utils/cloudinaryUtils.js";
import { resolveCertificatesWithOnChain } from "../services/blockchainSync.service.js";

// ─── Credential Type map (matches Types.CredentialType enum) ─────────────────
const CREDENTIAL_TYPE_MAP = {
  Certificate: 0,
  Project: 1,
  Internship: 2,
  Hackathon: 3,
  ResearchPaper: 4,
  Patent: 5,
  // Frontend certificateType → credentialType mapping
  Course: 0,
  Workshop: 0,
  Competition: 0,
  Professional: 0,
  Other: 0,
};

// ─── POST /api/certificate/upload ─────────────────────────────────────────────
/**
 * Student uploads a certificate PDF.
 * Steps:
 *  1. Validate file and fields
 *  2. Calculate SHA-256 from raw bytes
 *  3. Upload to Cloudinary
 *  4. Save metadata to MongoDB (status=Pending)
 *  5. Return certificate (NO automatic blockchain request)
 */
export const uploadCertificate = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No certificate file uploaded",
        errorCode: "FILE_REQUIRED",
      });
    }

    const studentId = req.user?.userId || req.user?._id;
    if (!studentId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const {
      certificateName,
      certificateType,
      issuer,
      issueDate,
      expiryDate,
      description,
    } = req.body;

    if (!certificateName || !certificateType || !issuer || !issueDate) {
      return res.status(400).json({
        success: false,
        message: "certificateName, certificateType, issuer and issueDate are required",
        errorCode: "MISSING_FIELDS",
      });
    }

    // Calculate SHA-256 hash of raw file bytes
    const hashBytes32 =
      "0x" + crypto.createHash("sha256").update(req.file.buffer).digest("hex");

    // Check for duplicate certificate hash
    const existing = await Certificate.findOne({ certificateHash: hashBytes32 });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This certificate has already been uploaded",
        errorCode: "DUPLICATE_CERTIFICATE",
      });
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname
    );

    // Save to MongoDB — status stays Pending until verified
    const certificate = await Certificate.create({
      student: studentId,
      certificateName,
      certificateType,
      issuer,
      issueDate: new Date(issueDate),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      description: description || "",
      certificateURL: cloudinaryResult.secure_url,
      certificateHash: hashBytes32,
      verificationStatus: "Pending",
      issuedByOrganisation: false,
    });

    console.log(`[CERTIFICATE] Uploaded certificate ${certificate._id}, hash: ${hashBytes32}`);

    return res.status(201).json({
      success: true,
      message: "Certificate uploaded successfully",
      certificate,
    });
  } catch (error) {
    console.error("[CERTIFICATE UPLOAD ERROR]:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Certificate upload failed",
    });
  }
};

// ─── GET /api/certificate/my ──────────────────────────────────────────────────
/** Student gets their own certificates (from JWT) with on-chain smart contract truth. */
export const getMyCertificates = async (req, res) => {
  try {
    const studentId = req.user?.userId || req.user?._id;
    const [studentUser, certificates] = await Promise.all([
      User.findById(studentId).select("applicantId").lean(),
      Certificate.find({ student: studentId })
        .populate("issuingOrganisation", "organisationName walletAddress organisationId")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const formattedCertificates = await resolveCertificatesWithOnChain(
      certificates,
      studentUser?.applicantId
    );

    return res.status(200).json({ success: true, certificates: formattedCertificates });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message, certificates: [] });
  }
};

// ─── GET /api/certificate/:studentId ──────────────────────────────────────────
/** Student gets certificates by their studentId param (backwards compat). */
export const getStudentCertificates = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user?.userId;
    if (!studentId) {
      return res
        .status(400)
        .json({ success: false, message: "Student ID is required" });
    }

    // Students can only see their own certs
    if (
      req.user.role === "STUDENT" &&
      studentId !== (req.user?.userId || req.user?._id)?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own certificates",
      });
    }

    const [studentUser, certificates] = await Promise.all([
      User.findById(studentId).select("applicantId").lean(),
      Certificate.find({ student: studentId })
        .populate("issuingOrganisation", "organisationName walletAddress organisationId")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const formattedCertificates = await resolveCertificatesWithOnChain(
      certificates,
      studentUser?.applicantId
    );

    return res.status(200).json({ success: true, certificates: formattedCertificates });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch certificates",
      certificates: [],
    });
  }
};

// ─── GET /api/certificate/students/:studentId ─────────────────────────────────
/** Organisation or Student gets a candidate's certificates with on-chain truth. */
export const getCandidateCertificates = async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user?.userId || req.user?._id;
    const role = req.user?.role;

    if (!studentId) {
      return res
        .status(400)
        .json({ success: false, message: "Student ID is required" });
    }

    const isSelf = role === "STUDENT" && userId?.toString() === studentId.toString();
    const isAdmin = role === "ADMIN";

    if (!isSelf && !isAdmin) {
      if (role === "ORGANISATION") {
        // Verify student applied to this organisation's job
        const application = await Application.findOne({
          student: studentId,
          organisation: userId,
        })
          .select("_id")
          .lean();

        // OR verify student submitted verification request to this organisation
        const verificationReq = !application
          ? await VerificationRequest.findOne({
              student: studentId,
              organisation: userId,
            })
              .select("_id")
              .lean()
          : null;

        if (!application && !verificationReq) {
          return res.status(403).json({
            success: false,
            message: "You are not allowed to view this candidate's certificates",
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to view this candidate's certificates",
        });
      }
    }

    const [studentUser, certificates] = await Promise.all([
      User.findById(studentId).select("applicantId").lean(),
      Certificate.find({ student: studentId })
        .populate("issuingOrganisation", "organisationName walletAddress organisationId")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const formattedCertificates = await resolveCertificatesWithOnChain(
      certificates,
      studentUser?.applicantId
    );

    return res.status(200).json({ success: true, certificates: formattedCertificates });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch candidate certificates",
      certificates: [],
    });
  }
};

// ─── GET /api/certificate/hash/:hash ─────────────────────────────────────────
export const getCertificateByHash = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      certificateHash: req.params.hash,
    });
    if (!certificate) {
      return res
        .status(404)
        .json({ success: false, message: "Certificate not found" });
    }
    return res.status(200).json({ success: true, certificate });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/certificate/document/:hash ─────────────────────────────────────
/** Stream certificate PDF. Only accessible to the owning student, issuing org, or admin. */
export const getCertificateDocument = async (req, res) => {
  try {
    const rawParam = req.params.hash;
    const isObjectId = mongoose.Types.ObjectId.isValid(rawParam);
    const certificate = await Certificate.findOne(
      isObjectId ? { $or: [{ certificateHash: rawParam }, { _id: rawParam }] } : { certificateHash: rawParam }
    );

    if (!certificate?.certificateURL) {
      return res
        .status(404)
        .json({ success: false, message: "Certificate document not found" });
    }

    const userId = req.user?.userId || req.user?._id;
    const role = req.user?.role;

    // Access control
    const studentOwnerId = (certificate.student?._id || certificate.student)?.toString();
    if (role === "STUDENT" && studentOwnerId && studentOwnerId !== userId?.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this certificate document",
      });
    }

    if (role === "ORGANISATION") {
      const org = await OrganisationApplication.findById(userId)
        .select("organisationName")
        .lean();

      let hasAccess = Boolean(
        org &&
        certificate.issuer &&
        org.organisationName.trim().toLowerCase() === certificate.issuer.trim().toLowerCase()
      );

      // Also allow if there is an active VerificationRequest for this organisation
      if (!hasAccess) {
        const hasReq = await VerificationRequest.findOne({
          organisation: userId,
          certificate: certificate._id,
        })
          .select("_id")
          .lean();
        if (hasReq) {
          hasAccess = true;
        }
      }

      // Also allow if org has an applicant that applied
      if (!hasAccess) {
        const anyApp = await Application.findOne({
          organisation: userId,
          student: certificate.student,
        })
          .select("_id")
          .lean();
        if (anyApp) {
          hasAccess = true;
        }
      }

      // Also allow if the certificate is verified
      if (!hasAccess && certificate.verificationStatus === "Verified") {
        hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to view this certificate document",
        });
      }
    }

    let documentResponse = null;

    // 1. Try direct fetch from certificateURL
    try {
      if (certificate.certificateURL) {
        documentResponse = await fetch(certificate.certificateURL);
      }
    } catch (fetchErr) {
      console.warn("[CERTIFICATE DOCUMENT] Direct fetch failed, trying signed URL:", fetchErr.message);
    }

    // 2. Fallback to Cloudinary private download URL if direct fetch was not OK
    if (!documentResponse || !documentResponse.ok) {
      try {
        const publicId = getRawPublicId(certificate.certificateURL);
        let downloadURL = cloudinary.utils.private_download_url(publicId, undefined, {
          resource_type: "raw",
          type: "upload",
        });
        documentResponse = await fetch(downloadURL);
        if (!documentResponse.ok) {
          downloadURL = cloudinary.utils.private_download_url(publicId, undefined, {
            resource_type: "image",
            type: "upload",
          });
          documentResponse = await fetch(downloadURL);
        }
      } catch (signedErr) {
        console.warn("[CERTIFICATE DOCUMENT] Signed download URL fetch failed:", signedErr.message);
      }
    }

    if (!documentResponse || !documentResponse.ok) {
      console.error("[CERTIFICATE DOCUMENT ERROR] Could not retrieve file from Cloudinary:", {
        status: documentResponse?.status,
        statusText: documentResponse?.statusText,
        url: certificate.certificateURL,
      });
      return res.status(502).json({
        success: false,
        message: "Certificate document could not be retrieved from storage",
      });
    }

    const arrayBuf = await documentResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // Detect actual content type from magic bytes so the browser displays it inline instead of downloading
    let finalContentType = "application/pdf";
    if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      finalContentType = "application/pdf";
    } else if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      finalContentType = "image/png";
    } else if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      finalContentType = "image/jpeg";
    } else if (certificate.certificateURL?.toLowerCase().includes(".png")) {
      finalContentType = "image/png";
    } else if (certificate.certificateURL?.toLowerCase().includes(".jpg") || certificate.certificateURL?.toLowerCase().includes(".jpeg")) {
      finalContentType = "image/jpeg";
    }

    res.setHeader("Content-Type", finalContentType);
    res.setHeader("Content-Disposition", "inline; filename=\"certificate.pdf\"");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve certificate document",
    });
  }
};

// ─── PUT /api/certificate/status ─────────────────────────────────────────────
/** Update a certificate's verification status (ORG/ADMIN). */
export const updateCertificateStatus = async (req, res) => {
  try {
    const { certificateHash, status, txHash, rejectionReason } = req.body;

    if (!certificateHash || !status) {
      return res.status(400).json({
        success: false,
        message: "certificateHash and status are required",
      });
    }

    const validStatuses = ["Pending", "Verified", "Rejected", "Revoked"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const update = {
      verificationStatus: status,
      rejectionReason: rejectionReason || "",
    };

    if (req.user?.role === "ORGANISATION" && status === "Verified") {
      update.issuingOrganisation = req.user.userId || req.user._id;
    }

    if (txHash) {
      update.txHash = txHash;
      update.blockchainStored = true;
      update.blockchainTxHash = txHash;
      update.blockchainStatus = "CONFIRMED";
    }

    const certificate = await Certificate.findOneAndUpdate(
      { certificateHash },
      update,
      { new: true }
    );

    if (!certificate) {
      return res
        .status(404)
        .json({ success: false, message: "Certificate not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Certificate status updated to ${status}`,
      certificate,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/certificate/issue ──────────────────────────────────────────────
/**
 * Organisation issues a certificate directly to a student.
 * Flow:
 *  1. Validate org is active + student exists
 *  2. Calculate SHA-256
 *  3. Upload to Cloudinary
 *  4. CertificateManager.issueCertificate(...)
 *  5. Wait for tx confirmation
 *  6. Save to MongoDB
 */
export const issueCertificate = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No certificate file uploaded",
        errorCode: "FILE_REQUIRED",
      });
    }

    const orgId = req.user?.userId || req.user?._id;

    // Get organisation with blockchain ID
    const organisation = await OrganisationApplication.findOne({
      _id: orgId,
      status: "Approved",
    });

    if (!organisation) {
      return res.status(403).json({
        success: false,
        message: "Organisation not found or not approved",
        errorCode: "ORG_NOT_APPROVED",
      });
    }

    if (!organisation.organisationId) {
      return res.status(400).json({
        success: false,
        message: "Organisation does not have a blockchain ID. Contact admin.",
        errorCode: "ORG_NO_BLOCKCHAIN_ID",
      });
    }

    const {
      studentId,
      studentEmail,
      certificateName,
      certificateType,
      issueDate,
      expiryDate,
      description,
    } = req.body;

    const identifier = (studentId || studentEmail || "").trim();

    if (!identifier || !certificateName || !certificateType || !issueDate) {
      return res.status(400).json({
        success: false,
        message: "Student ID or Email, certificateName, certificateType, and issueDate are required",
      });
    }

    // Verify student exists and has blockchain identity
    let student = null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      student = await User.findById(identifier);
    }
    if (!student) {
      student = await User.findOne({
        $or: [
          { applicantId: identifier },
          { email: identifier.toLowerCase() },
          { usn: identifier.toUpperCase() },
        ],
      });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student not found with provided identifier: "${identifier}"`,
      });
    }

    if (!student.applicantId) {
      return res.status(400).json({
        success: false,
        message: `Student "${student.name}" does not have a blockchain applicant ID. They must complete on-chain registration first.`,
        errorCode: "STUDENT_NO_BLOCKCHAIN_ID",
      });
    }

    // Calculate SHA-256 of file bytes
    const hashBytes32 =
      "0x" + crypto.createHash("sha256").update(req.file.buffer).digest("hex");

    // Check for duplicate
    const existing = await Certificate.findOne({ certificateHash: hashBytes32 });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This certificate has already been issued",
        errorCode: "DUPLICATE_CERTIFICATE",
      });
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname
    );

    // Map credentialType
    const credentialTypeEnum = CREDENTIAL_TYPE_MAP[certificateType] ?? 0;

    // Calculate expiresAt (unix timestamp)
    let expiresAt = 0;
    if (expiryDate) {
      expiresAt = Math.floor(new Date(expiryDate).getTime() / 1000);
      if (Number.isNaN(expiresAt) || expiresAt <= 0) {
        return res.status(400).json({ success: false, message: "Invalid expiry date" });
      }
      const nowSec = Math.floor(Date.now() / 1000);
      if (expiresAt <= nowSec) {
        return res.status(400).json({
          success: false,
          message: "Expiry date must be in the future. The blockchain smart contract rejects past expiry dates.",
          errorCode: "INVALID_EXPIRY_PAST",
        });
      }
    }

    console.log(
      `[BLOCKCHAIN] Issuing certificate — applicant: ${student.applicantId}, org: ${organisation.organisationId}, hash: ${hashBytes32}`
    );

    // Submit blockchain transaction
    const transaction = await certificateManager.issueCertificate(
      student.applicantId,
      organisation.organisationId,
      hashBytes32,
      credentialTypeEnum,
      expiresAt
    );

    console.log(`[BLOCKCHAIN] issueCertificate tx submitted: ${transaction.hash}`);

    const receipt = await transaction.wait();

    const blockchainStatus = receipt.status === 1 ? "CONFIRMED" : "FAILED";

    console.log(`[BLOCKCHAIN] issueCertificate confirmed: ${receipt.hash}, status: ${blockchainStatus}`);

    if (blockchainStatus === "FAILED") {
      throw new Error("Blockchain transaction failed");
    }

    // Save to MongoDB
    const certificate = await Certificate.create({
      student: student._id,
      issuingOrganisation: orgId,
      certificateName,
      certificateType,
      issuer: organisation.organisationName,
      issueDate: new Date(issueDate),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      description: description || "",
      certificateURL: cloudinaryResult.secure_url,
      certificateHash: hashBytes32,
      verificationStatus: "Verified",
      blockchainStored: true,
      txHash: transaction.hash,
      blockchainTxHash: transaction.hash,
      blockchainBlockNumber: receipt.blockNumber,
      blockchainStatus,
      credentialType: credentialTypeEnum,
      issuedByOrganisation: true,
    });

    console.log(`[CERTIFICATE] Organisation-issued certificate saved: ${certificate._id}`);

    return res.status(201).json({
      success: true,
      message: "Certificate issued and recorded on blockchain",
      certificate,
      blockchain: {
        transactionHash: transaction.hash,
        blockNumber: receipt.blockNumber,
        status: blockchainStatus,
        certificateHash: hashBytes32,
      },
    });
  } catch (error) {
    console.error("[CERTIFICATE ISSUE ERROR]:", error.message);
    const errData = error?.data || error?.info?.error?.data || error?.error?.data || "";
    let message = error?.shortMessage || error?.reason || error?.message || "Certificate issuance failed";

    if (errData.includes("d36c8500") || message.includes("InvalidExpiry")) {
      message = "Blockchain rejected: Expiry date must be in the future (or left empty for non-expiring certificates).";
    } else if (errData.includes("4e487b71") || message.includes("DuplicateCertificate")) {
      message = "Blockchain rejected: This certificate hash already exists on-chain.";
    } else if (message.includes("InvalidApplicant")) {
      message = "Blockchain rejected: Student applicant ID does not exist on-chain.";
    } else if (message.includes("InvalidOrganisation")) {
      message = "Blockchain rejected: Organisation is not registered as active on-chain.";
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

// ─── POST /api/certificate/:certificateId/revoke ──────────────────────────────
/**
 * Revoke a certificate (ORG or ADMIN).
 * Calls CertificateManager.revokeCertificate on-chain,
 * then updates MongoDB status.
 */
export const revokeCertificate = async (req, res) => {
  try {
    const certificateId = req.params.certificateId || req.params.id;
    const { reason } = req.body;
    const actorId = req.user?.userId || req.user?._id;
    const role = req.user?.role;

    let certificate = null;
    if (certificateId && certificateId.match(/^[0-9a-fA-F]{24}$/)) {
      certificate = await Certificate.findById(certificateId);
    }
    if (!certificate && certificateId) {
      certificate = await Certificate.findOne({ certificateHash: certificateId });
    }

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
        errorCode: "CERTIFICATE_NOT_FOUND",
      });
    }

    if (certificate.verificationStatus === "Revoked") {
      return res.status(400).json({
        success: false,
        message: "Certificate is already revoked",
        errorCode: "ALREADY_REVOKED",
      });
    }

    // ORGANISATION: must be the issuing org
    if (role === "ORGANISATION") {
      const org = await OrganisationApplication.findById(actorId)
        .select("organisationName")
        .lean();
      const isIssuer =
        (org && org.organisationName === certificate.issuer) ||
        (certificate.issuingOrganisation &&
          certificate.issuingOrganisation.toString() === actorId.toString());

      if (!isIssuer) {
        return res.status(403).json({
          success: false,
          message: "You can only revoke certificates you have issued",
          errorCode: "UNAUTHORIZED_REVOKE",
        });
      }
    }

    // Only revoke on-chain if it was stored on-chain
    if (certificate.blockchainStored && certificate.certificateHash) {
      console.log(`[BLOCKCHAIN] Revoking certificate hash: ${certificate.certificateHash}`);

      const transaction = await certificateManager.revokeCertificate(
        certificate.certificateHash
      );

      console.log(`[BLOCKCHAIN] revokeCertificate tx submitted: ${transaction.hash}`);

      const receipt = await transaction.wait();

      const blockchainStatus = receipt.status === 1 ? "CONFIRMED" : "FAILED";

      console.log(`[BLOCKCHAIN] revokeCertificate confirmed: ${receipt.hash}, status: ${blockchainStatus}`);

      if (blockchainStatus === "FAILED") {
        throw new Error("Blockchain revocation transaction failed");
      }

      certificate.txHash = transaction.hash;
      certificate.blockchainTxHash = transaction.hash;
      certificate.blockchainBlockNumber = receipt.blockNumber;
    }

    certificate.verificationStatus = "Revoked";
    certificate.rejectionReason = reason || "Revoked by issuer";
    await certificate.save();

    console.log(`[CERTIFICATE] Certificate ${certificateId} revoked`);

    return res.status(200).json({
      success: true,
      message: "Certificate revoked successfully",
      certificate,
    });
  } catch (error) {
    console.error("[CERTIFICATE REVOKE ERROR]:", error.message);
    return res.status(500).json({
      success: false,
      message: error?.shortMessage || error?.reason || error?.message || "Certificate revocation failed",
    });
  }
};

// ─── GET /api/certificate/issued ──────────────────────────────────────────────
/** Organisation gets all certificates issued or verified by them. */
export const getIssuedCertificates = async (req, res) => {
  try {
    const orgId = req.user?.userId || req.user?._id;
    const certificates = await Certificate.find({
      $or: [
        { issuingOrganisation: orgId },
        { issuingOrganisation: orgId, issuedByOrganisation: true },
      ],
    })
      .populate("student", "name email usn college")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      certificates,
    });
  } catch (error) {
    console.error("[GET ISSUED CERTIFICATES ERROR]:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
      certificates: [],
    });
  }
};