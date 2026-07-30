import api from "./api";

export const getProfile=async(userData)=>{
        const response=await api.get("/profile",userData);
        return response.data.user;
}