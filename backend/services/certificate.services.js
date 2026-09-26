import Certificate from "../models/Certificate.js";

export const uploadCertificateService = async (data) => {
    const certificate = await Certificate.create({
        student: data.student,
        issuer: data.issuer,
        certificateName: data.certificateName,
        certificateType: data.certificateType,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate || null,
        description: data.description || "",
        certificateURL: data.certificateURL,
        certificateHash: data.certificateHash,
        blockchainStatus: "PENDING"
    });

    return certificate;
};

export const getStudentCertificatesService = async (studentId) => {

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