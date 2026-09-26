import api from "../api/api";

/** Admin: get pending organisation applications. */
export const getPendingApplications = async () => {
  const response = await api.get("/organisation/pending");
  return response.data.applications || [];
};

/** Admin: approve an organisation. Backend handles blockchain registration. */
export const approveOrganisation = async (id, txHash) => {
  const response = await api.put("/organisation/approve", { id, txHash });
  return response.data;
};

/** Admin: reject an organisation with reason. */
export const rejectOrganisation = async (id, rejectionReason) => {
  const response = await api.put("/organisation/reject", { id, rejectionReason });
  return response.data;
};

/** Get list of verified/approved organisations. */
export const getVerifiedOrganisations = async () => {
  const response = await api.get("/organisation/verified");
  return response.data.organisations || [];
};