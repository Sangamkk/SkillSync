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