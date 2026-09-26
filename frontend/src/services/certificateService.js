import api from "../api/api";

/** Student uploads a certificate PDF. Backend hashes + uploads to Cloudinary. */
export const uploadCertificate = async (formData) => {
  const response = await api.post("/certificate/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

/** Student gets their own certificates. */
export const getCertificates = async (studentId) => {
  // studentId param kept for backward compat but authenticated user is used server-side
  const url = studentId ? `/certificate/${studentId}` : "/certificate/my";
  const response = await api.get(url);
  return response.data;
};

export const getStudentCertificates = getCertificates;

/** Organisation gets a candidate's certificates (only if they applied). */
export const getCandidateCertificates = async (studentId) => {
  const response = await api.get(`/certificate/students/${studentId}`);
  return response.data;
};

/** Get certificate by its hash. */
export const getCertificateByHash = async (hash) => {
  const response = await api.get(`/certificate/hash/${hash}`);
  return response.data.certificate;
};

/** Update a certificate's verification status (ORG/ADMIN). */
export const updateCertificateStatus = async (certificateHash, status, txHash, rejectionReason) => {
  const response = await api.put("/certificate/status", {
    certificateHash,
    status,
    txHash,
    rejectionReason,
  });
  return response.data;
};

/** Stream certificate PDF as an object URL. */
export const getCertificateDocument = async (hash) => {
  const response = await api.get(`/certificate/document/${hash}`, {
    responseType: "blob",
  });
  const contentType = response.headers["content-type"] || "application/pdf";
  return URL.createObjectURL(new Blob([response.data], { type: contentType }));
};

/**
 * Organisation issues a certificate directly to a student.
 * Backend handles Cloudinary upload + CertificateManager.issueCertificate().
 */
export const issueCertificate = async (formData) => {
  const response = await api.post("/certificate/issue", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

/**
 * Revoke a certificate (ORG/ADMIN).
 * Backend calls blockchain revoke function.
 */
export const revokeCertificate = async (certificateId, reason) => {
  const response = await api.post(`/certificate/${certificateId}/revoke`, { reason });
  return response.data;
};