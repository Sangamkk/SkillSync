import api from "./api";

export const uploadCertificate = async (certificateData) => {
    const response = await api.post("certificate/upload",certificateData,{headers:{"Content-Type":"multipart/form-data"}});
    return response.data;
};

export const getCertificates = async (studentId) => {
    const response = await api.get(`certificate/${studentId}`);
    return response.data;
};

export const getCertificateByHash = async (hash) => {
    const response = await api.get(`certificate/hash/${hash}`);
    return response.data.certificate;
};