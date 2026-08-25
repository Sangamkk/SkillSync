import api from "./api";

export const createProject = async (data) => {
    const response = await api.post( "/student/projects", data );
    return response.data;
};

export const getPendingProjects = async () => {
    console.log("Starting")
    const response = await api.get( "/student/projects/pending" );
    console.log(response)
    return response.data.projects;
};