import Certificate from "../models/Certificate.js";
import OrganisationApplication from "../models/OrganisationApplication.js";
import { applicantManager } from "../blockchain/contracts.js";

const CREDENTIAL_TYPE_NAMES = [
  "Academic",
  "Skill",
  "Internship",
  "WorkExperience",
  "ProjectVerification",
  "Achievement",
];

const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Resolves certificates against the live Ethereum Sepolia smart contract (ApplicantManager).
 * Ensures verified status, verifiedBy, and timestamps come directly from the blockchain.
 *
 * @param {Array} certificates - List of certificate documents from MongoDB
 * @param {string} [studentApplicantId] - Optional student on-chain applicantId bytes32
 * @returns {Promise<Array>} - List of certificates with on-chain truth applied
 */
export const resolveCertificatesWithOnChain = async (certificates, studentApplicantId) => {
  if (!Array.isArray(certificates) || certificates.length === 0) {
    return [];
  }

  const onChainMap = new Map();

  // 1. Fetch all on-chain certificates for this student's applicantId if present
  if (studentApplicantId && studentApplicantId !== ZERO_HASH) {
    try {
      const onChainHashes = await applicantManager.getCertificates(studentApplicantId);
      if (Array.isArray(onChainHashes) && onChainHashes.length > 0) {
        const onChainDetails = await Promise.all(
          onChainHashes.map(async (h) => {
            try {
              const details = await applicantManager.certificates(h);
              return { hash: h, details };
            } catch {
              return { hash: h, details: null };
            }
          })
        );

        onChainDetails.forEach(({ hash, details }) => {
          if (details && details[0] && details[0] !== ZERO_HASH) {
            onChainMap.set(hash.toLowerCase(), details);
          }
        });
      }
    } catch (err) {
      console.warn("[ON-CHAIN APPLICANT CERTS NOTICE]:", err.message);
    }
  }

  // 2. Also check any certificate with a certificateHash that wasn't returned in the array above
  const remainingCerts = certificates.filter((c) => {
    if (!c.certificateHash) return false;
    return !onChainMap.has(c.certificateHash.toLowerCase());
  });

  if (remainingCerts.length > 0) {
    await Promise.all(
      remainingCerts.map(async (c) => {
        try {
          const hashBytes32 = c.certificateHash.startsWith("0x")
            ? c.certificateHash
            : "0x" + c.certificateHash;
          const details = await applicantManager.certificates(hashBytes32);
          if (details && details[0] && details[0] !== ZERO_HASH) {
            onChainMap.set(c.certificateHash.toLowerCase(), details);
          }
        } catch {
          // ignore individual fetch errors
        }
      })
    );
  }

  // 3. Resolve organization names for any on-chain organisationIds
  const orgIdsToFetch = new Set();
  for (const details of onChainMap.values()) {
    const orgId = details[2];
    if (orgId && orgId !== ZERO_HASH) {
      orgIdsToFetch.add(orgId);
    }
  }

  const orgMap = new Map();
  if (orgIdsToFetch.size > 0) {
    try {
      const orgs = await OrganisationApplication.find(
        { organisationId: { $in: Array.from(orgIdsToFetch) } },
        { organisationId: 1, organisationName: 1 }
      ).lean();
      orgs.forEach((o) => orgMap.set(o.organisationId, o.organisationName));
    } catch {
      // ignore
    }
  }

  const nowSec = Math.floor(Date.now() / 1000);

  // 4. Map MongoDB certificates to on-chain truth
  return certificates.map((cert) => {
    const lowerHash = (cert.certificateHash || "").toLowerCase();
    const onChainCert = onChainMap.get(lowerHash);

    if (onChainCert) {
      const isRevoked = Boolean(onChainCert[6]);
      const expiresAtSec = Number(onChainCert[5]);
      const isExpired = expiresAtSec > 0 && expiresAtSec <= nowSec;
      const issuedAtSec = Number(onChainCert[4]);
      const orgId = onChainCert[2];
      const onChainOrgName =
        orgMap.get(orgId) ||
        cert.issuingOrganisation?.organisationName ||
        cert.issuer;
      const credType =
        CREDENTIAL_TYPE_NAMES[Number(onChainCert[3])] || cert.certificateType;

      let finalStatus = "Verified";
      if (isRevoked) finalStatus = "Revoked";
      else if (isExpired) finalStatus = "Expired";

      // Self-heal MongoDB cache asynchronously
      if (cert.verificationStatus !== finalStatus || !cert.blockchainStored) {
        Certificate.updateOne(
          { _id: cert._id },
          { $set: { verificationStatus: finalStatus, blockchainStored: true } }
        )
          .exec()
          .catch(() => {});
      }

      return {
        ...cert,
        certificateType: credType || cert.certificateType,
        verificationStatus: finalStatus,
        verifiedOnChain: true,
        blockchainStatus: finalStatus.toUpperCase(),
        verifiedBy: onChainOrgName || "Authorized Organisation",
        issuer: onChainOrgName || cert.issuer,
        issuerWallet:
          cert.issuingOrganisation?.walletAddress || cert.issuerWallet || "",
        verificationDate:
          issuedAtSec ||
          (cert.updatedAt
            ? Math.floor(new Date(cert.updatedAt).getTime() / 1000)
            : null),
        onChainOrganisationId: orgId,
        onChainIssuedAt: issuedAtSec,
      };
    }

    return {
      ...cert,
      verifiedOnChain: false,
      blockchainStatus: cert.verificationStatus
        ? cert.verificationStatus.toUpperCase()
        : "PENDING",
      verifiedBy:
        cert.issuingOrganisation?.organisationName ||
        (cert.verificationStatus === "Verified" ? cert.issuer : ""),
      issuerWallet:
        cert.issuingOrganisation?.walletAddress || cert.issuerWallet || "",
      verificationDate: cert.updatedAt
        ? Math.floor(new Date(cert.updatedAt).getTime() / 1000)
        : null,
    };
  });
};
