import api from "./api";

export const applyOrganisation = async (data) => {
    const response = await api.post( "organisation/apply", data );
    return response.data;
};

export const getPendingApplications = async () => {
    const response = await axios.get( `${API}/pending` );
    return response.data;
};

