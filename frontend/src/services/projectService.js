import api from "./api";

export const createProject = async (data) => {
    const response = await api.post( "/student/projects", data );
    return response.data;
};