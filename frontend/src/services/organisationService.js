import api from "../api/api";

/** Submit organisation registration application. */
export const applyOrganisation = async (data) => {
  const response = await api.post("/organisation/apply", data);
  return response.data;
};

/** Organisation: get own profile. */
export const getOrganisationProfile = async () => {
  const response = await api.get("/organisation/profile");
  return response.data;
};

/** Get list of all approved/verified organisations. */
export const getVerifiedOrganisations = async () => {
  const response = await api.get("/organisation/verified");
  return response.data.organisations || [];
};
