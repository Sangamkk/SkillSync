import api from "../api/api";

/** @deprecated old blockchain hash helper — kept for display formatting only */
export const normalizeHash = (value) => {
  if (!value) return "";
  const text = String(value).toLowerCase();
  return text.startsWith("0x") ? text : `0x${text}`;
};

/**
 * Load the professional profile for a student.
 * All data (certs, projects, employment) comes from the backend — no blockchain queries.
 *
 * @param {object} opts - { studentId? } — if omitted, uses authenticated user
 */
export const loadProfessionalProfile = async ({ studentId, viewerRole } = {}) => {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = (currentUser._id || currentUser.userId || currentUser.id || "").toString();

  const isStudentSelf =
    viewerRole === "STUDENT" ||
    currentUser.role === "STUDENT" ||
    !studentId ||
    (currentUserId && studentId.toString() === currentUserId);

  try {
    const url = isStudentSelf ? "/student/profile/full" : `/students/${studentId}/profile`;
    const response = await api.get(url);
    const data = response.data;
    return {
      certificates: data.certificates || [],
      projects: data.projects || [],
      currentEmployment: data.currentEmployment || [],
      previousEmployment: data.previousEmployment || [],
    };
  } catch (err) {
    console.warn("Primary profile fetch failed, using fallback:", err.message);
    // Fallback: fetch pieces separately
    const [certsRes, projRes, empRes] = await Promise.allSettled([
      isStudentSelf
        ? api.get("/certificate/my")
        : api.get(`/certificate/students/${studentId}`),
      isStudentSelf
        ? api.get("/student/projects")
        : api.get(`/student/candidates/${studentId}/projects`),
      isStudentSelf
        ? api.get("/employment/my")
        : api.get(`/employment/students/${studentId}`),
    ]);

    const certs =
      certsRes.status === "fulfilled"
        ? certsRes.value.data?.certificates || certsRes.value.data || []
        : [];
    const projects =
      projRes.status === "fulfilled"
        ? projRes.value.data?.projects || projRes.value.data || []
        : [];
    const emp =
      empRes.status === "fulfilled" ? empRes.value.data : {};

    return {
      certificates: Array.isArray(certs) ? certs : [],
      projects: Array.isArray(projects) ? projects : [],
      currentEmployment: emp?.currentEmployment || [],
      previousEmployment: emp?.previousEmployment || [],
    };
  }
};
