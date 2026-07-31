import axios from "axios";

const STUDENT_API = axios.create({
    baseURL: "http://localhost:5000/api/student"
});
export const getProfile=async(walletAddress)=>{
        const response=await STUDENT_API.get("/profile",{params:{walletAddress}});
        return response.data.user;
}