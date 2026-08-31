import api from "./api";

export const mlBackend=async(certificateId)=>{
    const response=await api.post(`/ml/${certificateId}/predict`);
    return response.data;
}

export const extractCertificate = async (certificateId) => {
    const response = await api.post( `/ml/${certificateId}/extract` );
    return response.data;
};