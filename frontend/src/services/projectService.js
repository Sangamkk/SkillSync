import api from "./api";

export const createProject = async (data) => {
    const response = await api.post( "/student/projects", data );
    return response.data;
};

export const getPendingProjects = async () => {
    const response = await api.get("/student/projects/pending");
    return response.data.projects;
};

export const getStudentProjects = async (studentId) => {
    const url = studentId ? `/student/projects?studentId=${studentId}` : "/student/projects";
    const response = await api.get(url);
    return response.data.projects || response.data || [];
};

export const updateProjectStatus = async (id, status, txHash, rejectionReason, extraData = {}) => {
    const response = await api.put("/student/projects/status", {
        id,
        status,
        txHash,
        rejectionReason,
        ...extraData
    });
    return response.data;
};