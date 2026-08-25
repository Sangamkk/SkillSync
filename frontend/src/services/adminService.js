import api from "./api";

export const getPendingApplications = async () => {

    const response = await api.get(
        "/organisation/pending"
    );

    return response.data.applications;
};


export const approveOrganisation = async (id, txHash) => {

    const response = await api.put(
        "/organisation/approve",
        {
            id,
            txHash
        }
    );

    return response.data;
};


export const rejectOrganisation = async (id) => {

    const response = await api.put(
        "/organisation/reject",
        {
            id
        }
    );

    return response.data;
};


export const getVerifiedOrganisations = async () => {
    const response = await api.get("/organisation/verified");
    console.log("Verified organisations response:", response);
    return response.data.organisations;
};