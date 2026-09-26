import api from "../api/api";

/**
 * Student submits a verification request for one of their certificates.
 * Backend handles blockchain RequestManager internally.
 *
 * @param {object} data - { certificateId, organisationId, notes? }
 */
export const createVerificationRequest = async (data) => {
  const response = await api.post("/verification-requests", data);
  return response.data;
};

/**
 * Student submits a project verification request.
 * @param {object} data - { projectId, organisationId }
 */
export const createProjectVerificationRequest = async (data) => {
  const response = await api.post("/verification-requests/project", data);
  return response.data;
};

/** Student: get all their verification requests. */
export const getMyRequests = async () => {
  const response = await api.get("/verification-requests/my");
  return response.data.requests || response.data || [];
};

/** Organisation: get pending requests assigned to them. */
export const getPendingRequests = async () => {
  const response = await api.get("/verification-requests/pending");
  return response.data.requests || response.data || [];
};

/** Organisation: get past request history (Approved, Rejected, etc.). */
export const getOrganisationRequestHistory = async (status) => {
  const url = status ? `/verification-requests/history?status=${status}` : "/verification-requests/history";
  const response = await api.get(url);
  return response.data.requests || response.data || [];
};

/** Organisation: approve a request. Backend calls RequestManager. */
export const approveRequest = async (requestId) => {
  const response = await api.post(`/verification-requests/${requestId}/approve`);
  return response.data;
};

/** Organisation: reject a request with reason. Backend calls RequestManager. */
export const rejectRequest = async (requestId, reason) => {
  const response = await api.post(`/verification-requests/${requestId}/reject`, { reason });
  return response.data;
};

/** Student: cancel their own pending request. */
export const cancelRequest = async (requestId) => {
  const response = await api.post(`/verification-requests/${requestId}/cancel`);
  return response.data;
};
