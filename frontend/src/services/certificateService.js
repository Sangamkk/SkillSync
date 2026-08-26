import api from "./api";

export const uploadCertificate = async (certificateData) => {
    const response = await api.post("certificate/upload",certificateData,{headers:{"Content-Type":"multipart/form-data"}});
    return response.data;
};

export const getCertificates = async (studentId) => {
    const response = await api.get(`certificate/${studentId}`);
    return response.data;
};

export const getStudentCertificates = getCertificates;

export const getCertificateByHash = async (hash) => {
    const response = await api.get(`certificate/hash/${hash}`);
    return response.data.certificate;
};

export const updateCertificateStatus = async (certificateHash, status, txHash, rejectionReason) => {
    const response = await api.put("certificate/status", {
        certificateHash,
        status,
        txHash,
        rejectionReason
    });
    return response.data;
};