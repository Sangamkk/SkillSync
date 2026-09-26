import api from "../api/api";

/**
 * Public certificate verification — no auth required.
 * Returns certificate metadata, blockchain status, hash, revocation info.
 *
 * @param {string} certificateId
 */
export const verifyCertificate = async (certificateId) => {
  const response = await api.get(`/public/verify/${certificateId}`);
  return response.data;
};

/**
 * Document hash verification — upload a PDF and backend checks hash against DB + blockchain.
 * No auth required.
 *
 * @param {FormData} formData - contains 'file' field
 */
export const verifyDocument = async (formData) => {
  const response = await api.post("/public/verify-document", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
