import axios from "axios";

const API =
"http://localhost:5000/api/organisation";

export const applyOrganisation = async (data) => {

    const response = await axios.post(

        `${API}/apply`,

        data

    );

    return response.data;

};

export const getPendingApplications =
async () => {

    const response = await axios.get(

        `${API}/pending`

    );

    return response.data;

};

