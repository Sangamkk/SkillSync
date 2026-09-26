import api from "../api/api";

/** Run ML authenticity prediction on a stored certificate. */
export const mlBackend = async (certificateId) => {
  const response = await api.post(`/ml/${certificateId}/predict`);
  return response.data;
};

export const mlPredict = mlBackend; // alias

/** Extract text / structured data from a stored certificate. */
export const extractCertificate = async (certificateId) => {
  const response = await api.post(`/ml/${certificateId}/extract`);
  return response.data;
};