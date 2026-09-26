import api from "../api/api";

/** Student creates a new project. Backend calculates hash internally. */
export const createProject = async (data) => {
  const response = await api.post("/student/projects", data);
  return response.data;
};

/** Student: get all my projects (or filter by studentId for org view). */
export const getStudentProjects = async (studentId) => {
  const url = studentId ? `/student/projects?studentId=${studentId}` : "/student/projects";
  const response = await api.get(url);
  return response.data.projects || response.data || [];
};

export const getMyProjects = () => getStudentProjects();

/** Organisation: get projects pending their verification. */
export const getPendingProjects = async () => {
  const response = await api.get("/student/projects/pending");
  return response.data.projects || [];
};

/** Organisation: get a specific candidate's projects. */
export const getCandidateProjects = async (studentId) => {
  const response = await api.get(`/student/candidates/${studentId}/projects`);
  return response.data.projects || [];
};

/**
 * Update project status (approve / reject / update).
 * Backend handles blockchain write.
 */
export const updateProjectStatus = async (id, status, txHash, rejectionReason, extraData = {}) => {
  const response = await api.put("/student/projects/status", {
    id,
    status,
    txHash,
    rejectionReason,
    ...extraData,
  });
  return response.data;
};