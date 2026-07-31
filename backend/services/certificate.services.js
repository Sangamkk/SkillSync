import Certificate from "../models/Certificate.js";

export const uploadCertificateService = async (certificateData) => {

    const certificate = await Certificate.create(certificateData);

    return certificate;

};

export const  getStudentCertificatesService = async (studentId) => {

    return await Certificate.find({
        student: studentId
    }).sort({
        createdAt: -1
    });

};