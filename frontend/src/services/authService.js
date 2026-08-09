import api from "./api";

export const registerUser=async(userData)=>{
    const response=await api.post("auth/register",userData);
    console.log("data Ready---->",userData);
    return response.data

}

export const loginUser=async(userData)=>{
    const response=await api.post("auth/login",userData);
    return response.data
}
