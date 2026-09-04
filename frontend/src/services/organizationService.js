import api from "./api";



export const getPendingApplications = async () => {
    const response = await api.get( "organisation/pending" );
    return response.data;
};
