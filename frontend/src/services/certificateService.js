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

export const getCandidateCertificates = async (studentId) => {
    const response = await api.get(`certificate/students/${studentId}`);
    return response.data;
};

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

export const getCertificateDocument = async (hash) => {
    const response = await api.get(`certificate/document/${hash}`, {
        responseType: "blob",
    });
    const contentType = response.headers["content-type"] || response.data.type || "";
    console.log("Certificate document response:", {
        status: response.status,
        contentType,
        size: response.data.size,
    });

    if (response.status !== 200 || !contentType.toLowerCase().includes("application/pdf")) {
        throw new Error(`Certificate document response was not a PDF (${response.status}, ${contentType || "unknown content type"})`);
    }

    const documentUrl = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    console.log("Certificate document object URL:", documentUrl);
    return documentUrl;
};