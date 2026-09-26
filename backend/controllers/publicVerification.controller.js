import crypto from "crypto";
import Certificate from "../models/Certificate.js";
import User from "../models/User.js";
import OrganisationApplication from "../models/OrganisationApplication.js";
import { applicantManager } from "../blockchain/contracts.js";

// ─── GET /api/public/verify/:certificateId ────────────────────────────────────
/**
 * Public certificate verification — NO authentication required.
 * Returns enough data for the frontend to display certificate validity.
 * Cross-checks with on-chain Ethereum Sepolia smart contract (ApplicantManager).
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
      // Try by hash with or without 0x prefix
      const with0x = certificateId.startsWith("0x") ? certificateId : "0x" + certificateId;
      const without0x = certificateId.startsWith("0x") ? certificateId.slice(2) : certificateId;
      certificate = await Certificate.findOne({
        $or: [
          { certificateHash: with0x },
          { certificateHash: without0x },
          { certificateHash: certificateId },
        ],
      })
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

    // ── Live smart contract cross-check on Sepolia ──
    const CREDENTIAL_TYPE_NAMES = [
      "Academic",
      "Skill",
      "Internship",
      "WorkExperience",
      "ProjectVerification",
      "Achievement",
    ];

    let blockchainVerification = {
      verifiedOnChain: false,
      contractAddress: process.env.APPLICANT_MANAGER_ADDRESS || null,
      network: "Ethereum Sepolia",
      onChainCertificateHash: null,
      onChainApplicantId: null,
      onChainOrganisationId: null,
      onChainIssuedAt: null,
      onChainExpiresAt: null,
      onChainRevoked: false,
      liveChecked: false,
      verifiedBy: null,
      verifiedFor: null,
    };

    if (certificate.certificateHash) {
      try {
        const hashBytes32 = certificate.certificateHash.startsWith("0x")
          ? certificate.certificateHash
          : "0x" + certificate.certificateHash;

        const onChainCert = await applicantManager.certificates(hashBytes32);
        if (
          onChainCert &&
          onChainCert[0] &&
          onChainCert[0] !== "0x0000000000000000000000000000000000000000000000000000000000000000"
        ) {
          const isRevokedOnChain = Boolean(onChainCert[6]);
          const expiresAtSec = Number(onChainCert[5]);
          const isExpiredOnChain = expiresAtSec !== 0 && expiresAtSec <= Math.floor(Date.now() / 1000);

          // Fetch verifiedBy organisation identity from on-chain organisationId
          let onChainVerifierOrg = null;
          if (onChainCert[2] && onChainCert[2] !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            onChainVerifierOrg = await OrganisationApplication.findOne(
              { organisationId: onChainCert[2] },
              { organisationName: 1, organisationType: 1 }
            ).lean();
          }

          // Fetch verifiedFor student recipient identity from on-chain applicantId
          let onChainRecipientStudent = null;
          if (onChainCert[1] && onChainCert[1] !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            onChainRecipientStudent = await User.findOne(
              { applicantId: onChainCert[1] },
              { name: 1, usn: 1, college: 1 }
            ).lean();
          }

          const credentialTypeIndex = Number(onChainCert[3]);
          const credentialTypeName = CREDENTIAL_TYPE_NAMES[credentialTypeIndex] || "Certificate";

          blockchainVerification = {
            verifiedOnChain: true,
            contractAddress: process.env.APPLICANT_MANAGER_ADDRESS || null,
            network: "Ethereum Sepolia",
            onChainCertificateHash: onChainCert[0],
            onChainApplicantId: onChainCert[1],
            onChainOrganisationId: onChainCert[2],
            credentialType: credentialTypeName,
            onChainIssuedAt: Number(onChainCert[4]) ? new Date(Number(onChainCert[4]) * 1000).toISOString() : null,
            onChainExpiresAt: expiresAtSec ? new Date(expiresAtSec * 1000).toISOString() : null,
            onChainRevoked: isRevokedOnChain,
            liveChecked: true,
            verifiedBy: {
              organisationId: onChainCert[2],
              name: onChainVerifierOrg ? onChainVerifierOrg.organisationName : certificate.issuer,
              type: onChainVerifierOrg ? onChainVerifierOrg.organisationType : null,
            },
            verifiedFor: {
              applicantId: onChainCert[1],
              name: onChainRecipientStudent ? onChainRecipientStudent.name : (certificate.student?.name || null),
              usn: onChainRecipientStudent ? onChainRecipientStudent.usn : (certificate.student?.usn || null),
              college: onChainRecipientStudent ? onChainRecipientStudent.college : (certificate.student?.college || null),
            },
          };

          if (isRevokedOnChain) {
            resultStatus = "REVOKED";
          } else if (isExpiredOnChain) {
            resultStatus = "EXPIRED";
          } else {
            resultStatus = "VALID";
          }
        } else {
          blockchainVerification.liveChecked = true;
        }
      } catch (chainErr) {
        console.warn("[LIVE ON-CHAIN VERIFICATION NOTICE]:", chainErr.message);
      }
    }

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
      blockchain: blockchainVerification,
      certificate: {
        _id: certificate._id,
        certificateName: certificate.certificateName,
        certificateType: certificate.certificateType,
        issuer: certificate.issuer,
        issuerInfo,
        issueDate: certificate.issueDate,
        expiryDate: certificate.expiryDate,
        verificationStatus: blockchainVerification.verifiedOnChain
          ? (blockchainVerification.onChainRevoked ? "Revoked" : "Verified")
          : certificate.verificationStatus,
        certificateHash: certificate.certificateHash,
        certificateURL: certificate.certificateURL,
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
    const rawHash = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
    const hashWith0x = "0x" + rawHash;
    const hashWithout0x = rawHash;
    const computedHash = hashWith0x;

    const certificate = await Certificate.findOne({
      $or: [
        { certificateHash: hashWith0x },
        { certificateHash: hashWithout0x },
        { certificateHash: hashWith0x.toLowerCase() },
        { certificateHash: hashWithout0x.toLowerCase() },
      ],
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

    // ── Live smart contract cross-check on Sepolia ──
    const CREDENTIAL_TYPE_NAMES = [
      "Academic",
      "Skill",
      "Internship",
      "WorkExperience",
      "ProjectVerification",
      "Achievement",
    ];

    let blockchainVerification = {
      verifiedOnChain: false,
      contractAddress: process.env.APPLICANT_MANAGER_ADDRESS || null,
      network: "Ethereum Sepolia",
      onChainCertificateHash: null,
      onChainApplicantId: null,
      onChainOrganisationId: null,
      onChainIssuedAt: null,
      onChainExpiresAt: null,
      onChainRevoked: false,
      liveChecked: false,
      verifiedBy: null,
      verifiedFor: null,
    };

    if (certificate.certificateHash) {
      try {
        const hashBytes32 = certificate.certificateHash.startsWith("0x")
          ? certificate.certificateHash
          : "0x" + certificate.certificateHash;

        const onChainCert = await applicantManager.certificates(hashBytes32);
        if (
          onChainCert &&
          onChainCert[0] &&
          onChainCert[0] !== "0x0000000000000000000000000000000000000000000000000000000000000000"
        ) {
          const isRevokedOnChain = Boolean(onChainCert[6]);
          const expiresAtSec = Number(onChainCert[5]);
          const isExpiredOnChain = expiresAtSec !== 0 && expiresAtSec <= Math.floor(Date.now() / 1000);

          let onChainVerifierOrg = null;
          if (onChainCert[2] && onChainCert[2] !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            onChainVerifierOrg = await OrganisationApplication.findOne(
              { organisationId: onChainCert[2] },
              { organisationName: 1, organisationType: 1 }
            ).lean();
          }

          let onChainRecipientStudent = null;
          if (onChainCert[1] && onChainCert[1] !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            onChainRecipientStudent = await User.findOne(
              { applicantId: onChainCert[1] },
              { name: 1, usn: 1, college: 1 }
            ).lean();
          }

          const credentialTypeIndex = Number(onChainCert[3]);
          const credentialTypeName = CREDENTIAL_TYPE_NAMES[credentialTypeIndex] || "Certificate";

          blockchainVerification = {
            verifiedOnChain: true,
            contractAddress: process.env.APPLICANT_MANAGER_ADDRESS || null,
            network: "Ethereum Sepolia",
            onChainCertificateHash: onChainCert[0],
            onChainApplicantId: onChainCert[1],
            onChainOrganisationId: onChainCert[2],
            credentialType: credentialTypeName,
            onChainIssuedAt: Number(onChainCert[4]) ? new Date(Number(onChainCert[4]) * 1000).toISOString() : null,
            onChainExpiresAt: expiresAtSec ? new Date(expiresAtSec * 1000).toISOString() : null,
            onChainRevoked: isRevokedOnChain,
            liveChecked: true,
            verifiedBy: {
              organisationId: onChainCert[2],
              name: onChainVerifierOrg ? onChainVerifierOrg.organisationName : certificate.issuer,
              type: onChainVerifierOrg ? onChainVerifierOrg.organisationType : null,
            },
            verifiedFor: {
              applicantId: onChainCert[1],
              name: onChainRecipientStudent ? onChainRecipientStudent.name : (certificate.student?.name || null),
              usn: onChainRecipientStudent ? onChainRecipientStudent.usn : (certificate.student?.usn || null),
              college: onChainRecipientStudent ? onChainRecipientStudent.college : (certificate.student?.college || null),
            },
          };

          if (isRevokedOnChain) {
            status = "REVOKED";
          } else if (isExpiredOnChain) {
            status = "EXPIRED";
          } else {
            status = "VALID";
          }
        } else {
          blockchainVerification.liveChecked = true;
        }
      } catch (chainErr) {
        console.warn("[LIVE ON-CHAIN DOCUMENT VERIFICATION NOTICE]:", chainErr.message);
      }
    }

    // Resolve human-readable issuer name
    let issuerName = certificate.issuer;
    if (certificate.issuingOrganisation) {
      const org = await OrganisationApplication.findById(
        certificate.issuingOrganisation,
        { organisationName: 1 }
      ).lean();
      if (org && org.organisationName) {
        issuerName = org.organisationName;
      }
    }

    return res.status(200).json({
      success: true,
      valid: status === "VALID",
      status,
      computedHash,
      blockchain: blockchainVerification,
      certificate: {
        _id: certificate._id,
        certificateName: certificate.certificateName,
        certificateType: certificate.certificateType,
        issuer: issuerName || certificate.issuer,
        issueDate: certificate.issueDate,
        expiryDate: certificate.expiryDate,
        verificationStatus: certificate.verificationStatus,
        certificateHash: certificate.certificateHash,
        certificateURL: certificate.certificateURL,
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
