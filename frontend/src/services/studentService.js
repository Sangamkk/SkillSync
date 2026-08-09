import api from "./api";

export const getProfile=async(walletAddress)=>{
        console.log("WA");
        const response=await api.get("student/profile",{params:{walletAddress}});
        return response.data.user;
}