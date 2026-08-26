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

export const getCertificateByHashService = async (hash) => {
    return await Certificate.findOne({
        certificateHash: hash
    });
};

export const updateCertificateStatusService = async (certificateHash, status, txHash, rejectionReason) => {
    const update = {
        verificationStatus: status,
        rejectionReason: rejectionReason || ""
    };
    if (txHash) {
        update.txHash = txHash;
        update.blockchainStored = true;
    }
    return await Certificate.findOneAndUpdate(
        { certificateHash },
        update,
        { new: true }
    );
};