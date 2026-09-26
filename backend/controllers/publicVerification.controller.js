import crypto from "crypto";
import Certificate from "../models/Certificate.js";
import User from "../models/User.js";
import OrganisationApplication from "../models/OrganisationApplication.js";

// ─── GET /api/public/verify/:certificateId ────────────────────────────────────
/**
 * Public certificate verification — NO authentication required.
 * Returns enough data for the frontend to display certificate validity.
 */
export const verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    // Try to find by MongoDB _id first, then by certificateHash
    let certificate = null;

    if (certificateId.match(/^[0-9a-fA-F]{24}$/)) {
      certificate = await Certificate.findById(certificateId)
        .populate("student", "name usn college")
        .lean();
    }

    if (!certificate) {
      // Try by hash (with or without 0x prefix)
      const normalizedHash = certificateId.startsWith("0x")
        ? certificateId
        : "0x" + certificateId;
      certificate = await Certificate.findOne({ certificateHash: normalizedHash })
        .populate("student", "name usn college")
        .lean();
    }

    if (!certificate) {
      return res.status(200).json({
        success: false,
        valid: false,
        status: "NOT_FOUND",
        message: "Certificate not found",
      });
    }

    const now = new Date();
    const isExpired = certificate.expiryDate && new Date(certificate.expiryDate) < now;
    const isRevoked = certificate.verificationStatus === "Revoked";
    const isVerified = certificate.verificationStatus === "Verified";

    let resultStatus = "INVALID";
    if (isRevoked) resultStatus = "REVOKED";
    else if (isExpired) resultStatus = "EXPIRED";
    else if (isVerified) resultStatus = "VALID";
    else if (certificate.verificationStatus === "Pending") resultStatus = "PENDING";
    else resultStatus = "REJECTED";

    // Get issuing organisation name (without sensitive data)
    let issuerInfo = { name: certificate.issuer };
    if (certificate.issuingOrganisation) {
      const org = await OrganisationApplication.findById(
        certificate.issuingOrganisation,
        { organisationName: 1, organisationType: 1 }
      ).lean();
      if (org) {
        issuerInfo = {
          name: org.organisationName,
          type: org.organisationType,
        };
      }
    }

    return res.status(200).json({
      success: true,
      valid: resultStatus === "VALID",
      status: resultStatus,
      certificate: {
        _id: certificate._id,
        certificateName: certificate.certificateName,
        certificateType: certificate.certificateType,
        issuer: certificate.issuer,
        issuerInfo,
        issueDate: certificate.issueDate,
        expiryDate: certificate.expiryDate,
        verificationStatus: certificate.verificationStatus,
        certificateHash: certificate.certificateHash,
        transactionHash: certificate.txHash || certificate.blockchainTxHash || null,
        blockchainStored: certificate.blockchainStored,
        issuedByOrganisation: certificate.issuedByOrganisation,
        student: certificate.student
          ? {
              name: certificate.student.name,
              usn: certificate.student.usn,
              college: certificate.student.college,
            }
          : null,
        createdAt: certificate.createdAt,
        updatedAt: certificate.updatedAt,
      },
      message: {
        VALID: "Certificate is verified and valid",
        INVALID: "Certificate could not be verified",
        REVOKED: "Certificate has been revoked",
        EXPIRED: "Certificate has expired",
        PENDING: "Certificate verification is pending",
        REJECTED: "Certificate verification was rejected",
        NOT_FOUND: "Certificate not found",
      }[resultStatus],
    });
  } catch (error) {
    console.error("[PUBLIC VERIFY ERROR]:", error.message);
    return res.status(500).json({
      success: false,
      valid: false,
      status: "ERROR",
      message: "Verification service error",
    });
  }
};

// ─── POST /api/public/verify-document ─────────────────────────────────────────
/**
 * Document hash verification — user uploads a PDF and backend checks hash.
 * NO authentication required.
 */
export const verifyDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        valid: false,
        status: "ERROR",
        message: "No document uploaded",
      });
    }

    // Calculate SHA-256 from the raw uploaded bytes
    const computedHash =
      "0x" + crypto.createHash("sha256").update(req.file.buffer).digest("hex");

    const certificate = await Certificate.findOne({
      certificateHash: computedHash,
    })
      .populate("student", "name usn college")
      .lean();

    if (!certificate) {
      return res.status(200).json({
        success: true,
        valid: false,
        status: "NOT_FOUND",
        computedHash,
        message: "No certificate found matching this document",
      });
    }

    const now = new Date();
    const isExpired = certificate.expiryDate && new Date(certificate.expiryDate) < now;
    const isRevoked = certificate.verificationStatus === "Revoked";
    const isVerified = certificate.verificationStatus === "Verified";

    let status = "INVALID";
    if (isRevoked) status = "REVOKED";
    else if (isExpired) status = "EXPIRED";
    else if (isVerified) status = "VALID";
    else if (certificate.verificationStatus === "Pending") status = "PENDING";
    else status = "REJECTED";

    return res.status(200).json({
      success: true,
      valid: status === "VALID",
      status,
      computedHash,
      certificate: {
        _id: certificate._id,
        certificateName: certificate.certificateName,
        certificateType: certificate.certificateType,
        issuer: certificate.issuer,
        issueDate: certificate.issueDate,
        expiryDate: certificate.expiryDate,
        verificationStatus: certificate.verificationStatus,
        certificateHash: certificate.certificateHash,
        transactionHash: certificate.txHash || certificate.blockchainTxHash || null,
        blockchainStored: certificate.blockchainStored,
        student: certificate.student
          ? {
              name: certificate.student.name,
              usn: certificate.student.usn,
              college: certificate.student.college,
            }
          : null,
      },
      message: {
        VALID: "Document matches a verified certificate",
        INVALID: "Document does not match any verified certificate",
        REVOKED: "Document matches a REVOKED certificate",
        EXPIRED: "Document matches an EXPIRED certificate",
        PENDING: "Document matches a certificate pending verification",
        REJECTED: "Document matches a rejected certificate",
        NOT_FOUND: "No certificate found matching this document",
      }[status],
    });
  } catch (error) {
    console.error("[DOCUMENT VERIFY ERROR]:", error.message);
    return res.status(500).json({
      success: false,
      valid: false,
      status: "ERROR",
      message: "Document verification service error",
    });
  }
};
