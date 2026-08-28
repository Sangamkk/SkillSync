import { getVerifiedOrganisations } from "./adminService";
import { getCertificates, getCandidateCertificates } from "./certificateService";
import { getStudentProjects, getCandidateProjects } from "./projectService";
import { getRequestsForStudent } from "./requestService";
import { getStudentEmploymentById, getMyEmployment } from "./employmentService";
import {
  getApplicantProjectsDetailed,
  getStudentCertificatesOnChain,
  getStudentEmploymentOnChain,
} from "./blockchainService";

const toArray = (value, key) => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value[key])) return value[key];
  if (value && Array.isArray(value.records)) return value.records;
  return [];
};

export const normalizeHash = (value) => {
  if (value == null) return "";

  let text = "";
  if (typeof value === "string") {
    text = value;
  } else if (typeof value === "bigint" || typeof value === "number") {
    text = String(value);
  } else if (typeof value === "object") {
    if (typeof value.toHexString === "function") {
      text = value.toHexString();
    } else if (typeof value.toString === "function") {
      text = value.toString();
    }
  }

  if (!text || text === "[object Object]") return "";
  const normalized = text.toLowerCase();
  return normalized.startsWith("0x") ? normalized : `0x${normalized}`;
};

const normalizeWallet = (value) => String(value || "").toLowerCase();

const requestStatusLabel = (status) => {
  switch (Number(status)) {
    case 0: return "PENDING";
    case 1: return "VERIFIED";
    case 2: return "REJECTED";
    case 3: return "CANCELLED";
    default: return "UNKNOWN";
  }
};

const organisationName = (wallet, organisations) => {
  const match = organisations.find(
    (organisation) => normalizeWallet(organisation.walletAddress) === normalizeWallet(wallet)
  );
  return match?.organisationName || match?.name || "";
};

const mergeProjectHistory = (project, requests, organisations) => {
  const chainHistory = toArray(project.verifications).map((verification) => ({
    status: verification.revoked ? "REVOKED" : "VERIFIED",
    verifier: verification.verifier,
    verifierOrganisation: organisationName(verification.verifier, organisations),
    wallet: verification.verifier,
    verifiedAt: Number(verification.verifiedAt || 0),
    revoked: Boolean(verification.revoked),
    source: "blockchain",
  }));

  const requestHistory = requests
    .filter((request) => normalizeHash(request.credentialHash) === normalizeHash(project.hash))
    .map((request) => ({
      status: requestStatusLabel(request.status),
      verifier: request.expectedVerifier,
      verifierOrganisation: organisationName(request.expectedVerifier, organisations),
      wallet: request.expectedVerifier,
      requestId: request.id,
      createdAt: Number(request.createdAt || 0),
      source: "request",
    }));

  return [...chainHistory, ...requestHistory];
};

const mergeEmployment = (chainRecords, mongoRecords, organisations) => {
  const metadataByHash = new Map(
    mongoRecords
      .filter((record) => record.employmentHash)
      .map((record) => [normalizeHash(record.employmentHash), record])
  );
  const seen = new Set();

  return chainRecords.reduce((records, chainRecord) => {
    const key = normalizeHash(chainRecord.employmentHash || chainRecord.hash);
    if (!key || seen.has(key)) return records;
    seen.add(key);

    const metadata = metadataByHash.get(key) || {};
    const organisationWallet = chainRecord.organisation || metadata.organisation?.walletAddress;
    records.push({
      ...chainRecord,
      ...metadata,
      employmentHash: chainRecord.employmentHash || chainRecord.hash,
      role: metadata.job?.title || metadata.title || metadata.role || "Role",
      organisation: metadata.organisation?.organisationName || metadata.organisation?.name || organisationName(organisationWallet, organisations) || organisationWallet || "Organisation",
      organisationWallet,
      employmentType: chainRecord.employmentType || metadata.job?.employmentType || metadata.employmentType || "Employment",
      offerId: chainRecord.offerId ?? metadata.offerId ?? null,
      joinedAt: Number(chainRecord.joinedAt || 0),
      endedAt: Number(chainRecord.endedAt || 0),
      status: chainRecord.active ? "ACTIVE" : "TERMINATED",
    });
    return records;
  }, []);
};

export const loadProfessionalProfile = async ({ walletAddress, studentId, viewerRole = "STUDENT" }) => {
  if (!walletAddress) {
    return { projects: [], certificates: [], currentEmployment: [], previousEmployment: [] };
  }

  const [chainProjects, mongoProjects, requests, chainCertificates, mongoCertificates, chainEmployment, mongoEmploymentResponse, organisations] = await Promise.all([
    getApplicantProjectsDetailed(walletAddress).catch(() => []),
    viewerRole === "ORGANISATION" && studentId
      ? getCandidateProjects(studentId).catch(() => [])
      : studentId
        ? getStudentProjects(studentId).catch(() => [])
        : Promise.resolve([]),
    getRequestsForStudent(walletAddress).catch(() => []),
    getStudentCertificatesOnChain(walletAddress).catch(() => []),
    viewerRole === "ORGANISATION" && studentId
      ? getCandidateCertificates(studentId).catch(() => ({ certificates: [] }))
      : studentId
        ? getCertificates(studentId).catch(() => ({ certificates: [] }))
        : Promise.resolve({ certificates: [] }),
    getStudentEmploymentOnChain(walletAddress).catch(() => ({ currentEmployment: [], previousEmployment: [] })),
    viewerRole === "ORGANISATION" && studentId
      ? getStudentEmploymentById(studentId).catch(() => ({ records: [] }))
      : getMyEmployment().catch(() => ({ currentEmployment: [], previousEmployment: [] })),
    getVerifiedOrganisations().catch(() => []),
  ]);

  const projectMetadataByHash = new Map(
    toArray(mongoProjects, "projects").map((project) => [normalizeHash(project.githubHash || project.projectHash), project])
  );
  const projects = chainProjects.map((chainProject) => {
    const hash = normalizeHash(chainProject.hash);
    const metadata = projectMetadataByHash.get(hash) || {};
    return {
      ...chainProject,
      hash,
      name: metadata.projectName || metadata.name || "Project",
      projectType: metadata.projectType || metadata.type || "Project",
      githubLink: metadata.githubLink || metadata.githubUrl || "",
      description: metadata.description || "",
      onChainRegistered: true,
      verificationHistory: mergeProjectHistory(chainProject, requests, organisations),
    };
  });

  const certificateMetadataByHash = new Map(
    toArray(mongoCertificates, "certificates").map((certificate) => [normalizeHash(certificate.certificateHash), certificate])
  );
  const chainCertificateHashes = new Set(chainCertificates.map((certificate) => normalizeHash(certificate.certificateHash)));
  const certificates = chainCertificates.map((chainCertificate) => {
    const metadata = certificateMetadataByHash.get(normalizeHash(chainCertificate.certificateHash)) || {};
    const requestHistory = requests
      .filter((request) => (
        Number(request.credentialType) === 0 &&
        Number(request.requestType) === 0 &&
        normalizeHash(request.credentialHash) === normalizeHash(chainCertificate.certificateHash)
      ))
      .map((request) => ({
        requestId: request.id,
        status: requestStatusLabel(request.status),
        expectedVerifier: request.expectedVerifier,
        expectedVerifierName: organisationName(request.expectedVerifier, organisations),
        createdAt: Number(request.createdAt || 0),
        expiresAt: Number(request.expiresAt || 0),
      }));

    return {
      ...chainCertificate,
      ...metadata,
      issuer: metadata.issuer || organisationName(chainCertificate.issuer, organisations) || chainCertificate.issuer,
      issuerWallet: chainCertificate.issuer,
      verificationStatus: chainCertificate.revoked ? "Rejected" : "Verified",
      verifiedBy: organisationName(chainCertificate.issuer, organisations) || chainCertificate.issuer,
      verificationDate: chainCertificate.issuedAt,
      requestHistory,
    };
  });

  toArray(mongoCertificates, "certificates")
    .filter((certificate) => !chainCertificateHashes.has(normalizeHash(certificate.certificateHash)))
    .forEach((certificate) => {
      const requestHistory = requests
        .filter((request) => (
          Number(request.credentialType) === 0 &&
          Number(request.requestType) === 0 &&
          normalizeHash(request.credentialHash) === normalizeHash(certificate.certificateHash)
        ))
        .map((request) => ({
          requestId: request.id,
          status: requestStatusLabel(request.status),
          expectedVerifier: request.expectedVerifier,
          expectedVerifierName: organisationName(request.expectedVerifier, organisations),
          createdAt: Number(request.createdAt || 0),
          expiresAt: Number(request.expiresAt || 0),
        }));
      const latestRequest = requestHistory[requestHistory.length - 1];

      certificates.push({
        ...certificate,
        onChainVerified: false,
        issuerWallet: latestRequest?.expectedVerifier || certificate.issuerWallet || "",
        verificationStatus: latestRequest?.status === "REJECTED"
          ? "Rejected"
          : latestRequest?.status === "VERIFIED"
            ? "Verified"
            : certificate.verificationStatus || "Pending",
        verifiedBy: latestRequest?.expectedVerifierName || latestRequest?.expectedVerifier || "",
        verificationDate: null,
        requestHistory,
      });
    });

  const mongoEmployment = Array.isArray(mongoEmploymentResponse?.records)
    ? mongoEmploymentResponse.records
    : [
      ...(mongoEmploymentResponse?.currentEmployment || []),
      ...(mongoEmploymentResponse?.previousEmployment || []),
    ];
  const mergedEmployment = mergeEmployment(
    [...chainEmployment.currentEmployment, ...chainEmployment.previousEmployment],
    mongoEmployment,
    organisations
  );

  return {
    projects,
    certificates,
    currentEmployment: mergedEmployment.filter((record) => record.active),
    previousEmployment: mergedEmployment.filter((record) => !record.active),
  };
};
