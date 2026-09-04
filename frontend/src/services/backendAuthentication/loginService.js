import api from "../api";

// Applicant Login
export const applicantLogin = async (data) => {
    console.log("Applicant wallet:", data.walletAddress);
    const response = await api.post( "auth/login", data);
    console.log("Applicant login response:", response);
    return response.data;
};


// Organisation Login
export const organisationLogin = async (data) => {
    console.log("Organisation wallet:", data.walletAddress);
    const response = await api.post( "organisation/login", data );
    console.log("Organisation login response:", response);
    return response.data;
};