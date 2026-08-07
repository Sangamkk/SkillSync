import axios from "axios";

const API = "http://localhost:5000/api/organisation";

export const getPendingApplications = async () => {

    const response = await axios.get(
        `${API}/pending`
    );

    return response.data.applications;

};

export const approveOrganisation = async(id,txHash)=>{
    const response = await axios.put("http://localhost:5000/api/organisation/approve",{id,txHash});
    return response.data;
};

export const rejectOrganisation = async (id) => {

    const response = await axios.put(
        "http://localhost:5000/api/organisation/reject",
        {
            id
        }
    );

    return response.data;

};

export const getVerifiedOrganisations = async () => {

    const response = await axios.get(
        "http://localhost:5000/api/organisation/verified"
    );

    return response.data.organisations;

};