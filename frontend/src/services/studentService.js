import api from "./api";

export const getProfile = async (walletAddress) => {
    const response = await api.get("student/profile", { params: { walletAddress } });
    return response.data.user;
};