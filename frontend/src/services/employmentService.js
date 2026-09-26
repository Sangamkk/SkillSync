import api from "../api/api";

// ─── Jobs ────────────────────────────────────────────────────────────────────

export const getAllJobs = async () => {
  const response = await api.get("/employment/jobs");
  return response.data;
};

export const getJobById = async (jobId) => {
  const response = await api.get(`/employment/jobs/${jobId}`);
  return response.data;
};

export const createJob = async (jobData) => {
  const response = await api.post("/employment/jobs", jobData);
  return response.data;
};

export const getMyJobs = async () => {
  const response = await api.get("/employment/jobs/my");
  return response.data;
};

export const deleteJob = async (jobId) => {
  const response = await api.delete(`/employment/jobs/${jobId}`);
  return response.data;
};

// ─── Applications ─────────────────────────────────────────────────────────────

export const applyToJob = async (jobId) => {
  const response = await api.post(`/employment/jobs/${jobId}/apply`);
  return response.data;
};

export const getMyApplications = async () => {
  const response = await api.get("/employment/applications/my");
  return response.data;
};

export const getApplicants = async (jobId) => {
  const response = await api.get(`/employment/jobs/${jobId}/applications`);
  return response.data;
};

export const getApplicantDetail = async (jobId, applicationId) => {
  const response = await api.get(`/employment/jobs/${jobId}/applications/${applicationId}`);
  return response.data;
};

// ─── Offers ──────────────────────────────────────────────────────────────────

export const createEmploymentOffer = async (applicationId, offerId, employmentHash, txHash) => {
  const response = await api.post(`/employment/applications/${applicationId}/offer`, {
    offerId,
    employmentHash,
    txHash,
  });
  return response.data;
};

export const getMyOffers = async () => {
  const response = await api.get("/employment/offers");
  return response.data;
};

export const acceptOffer = async (offerId) => {
  const response = await api.post(`/employment/offers/${offerId}/accept`);
  return response.data;
};

export const rejectOffer = async (offerId) => {
  const response = await api.post(`/employment/offers/${offerId}/reject`);
  return response.data;
};

// ─── Employment ───────────────────────────────────────────────────────────────

export const getMyEmployment = async () => {
  const response = await api.get("/employment/my");
  return response.data;
};

export const getStudentEmploymentById = async (studentId) => {
  const response = await api.get(`/employment/students/${studentId}`);
  return response.data;
};

export const getOrganisationEmployees = async () => {
  const response = await api.get("/employment/employees");
  return response.data;
};

export const terminateEmployment = async (offerId) => {
  const response = await api.post(`/employment/employees/${offerId}/terminate`);
  return response.data;
};