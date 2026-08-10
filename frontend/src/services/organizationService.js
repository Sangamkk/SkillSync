import api from "./api";

export const applyOrganisation = async (data) => {
    const response = await api.post( "organisation/apply", data );
    return response.data;
};

export const getPendingApplications = async () => {
    const response = await api.get( "organisation/pending" );
    return response.data;
};

export const orgLogin = async (walletAddress) => {
    console.log(walletAddress,".....")
    const response = await api.post( "organisation/login",
        {
            walletAddress
        }
    );
    console.log(response);
    return response.data;
};