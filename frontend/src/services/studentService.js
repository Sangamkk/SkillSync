import api from "../api/api";

export const getProfile = async () => {
  const response = await api.get("/student/profile");
  return response.data.user;
};

export const lookupStudent = async (identifier) => {
  if (!identifier) return null;
  const response = await api.get(`/students/lookup/${encodeURIComponent(identifier.trim())}`);
  return response.data.student;
};