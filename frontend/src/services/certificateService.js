import axios from "axios";


export const uploadCertificate = async (certificateData) => {
    const response = await axios.post("http://localhost:5000/api/certificate/upload",certificateData,{headers:{"Content-Type":"multipart/form-data"}});
    return response.data;
};

export const getCertificates = async (studentId) => {
    const response = await axios.get(`http://localhost:5000/api/certificate/${studentId}`);
    return response.data;
};