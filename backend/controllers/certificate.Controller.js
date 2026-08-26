import {
    uploadCertificateService,
    getStudentCertificatesService,
    getCertificateByHashService
} from "../services/certificate.services.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import crypto from "crypto";


const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(

            {
                resource_type: "auto",
                folder: "SkillSync/Certificates"
            },

            (error, result) => {

                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }

            }

        );

        streamifier.createReadStream(buffer).pipe(uploadStream);

    });

};

export const uploadCertificate = async (req, res) => {

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No certificate uploaded"
            });
        }
        console.log(req.file);
        const result = await uploadToCloudinary(req.file.buffer);

        const hashHex = crypto
            .createHash("sha256")
            .update(req.file.buffer)
            .digest("hex");
        const hashBytes32 = "0x" + hashHex;

        const studentId = req.user?.userId || req.body.student;
        const certificate = await uploadCertificateService({
            student: studentId,
            certificateName: req.body.certificateName,
            issuer: req.body.issuer,
            certificateType: req.body.certificateType,
            issueDate: req.body.issueDate,
            expiryDate: req.body.expiryDate || null,
            description: req.body.description,
            certificateURL: result.secure_url,
            certificateHash: hashBytes32
        });

        console.log("SHA-256 Hash :", hashHex);
        console.log("Bytes32 Hash :", hashBytes32);

        res.status(200).json({
            success: true,
            message: "Certificate uploaded and hash generated successfully",
            hashHex,
            hashBytes32,
            certificate
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getStudentCertificates = async (req, res) => {
    try {
        const studentId = req.params.studentId || req.user?.userId;
        const certificates = await getStudentCertificatesService(studentId);

        res.status(200).json({
            success: true,
            certificates
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getCertificateByHash = async (req, res) => {
    try {
        const { hash } = req.params;
        const certificate = await getCertificateByHashService(hash);

        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: "Certificate not found"
            });
        }

        res.status(200).json({
            success: true,
            certificate
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updateCertificateStatus = async (req, res) => {
    try {
        const { certificateHash, status, txHash, rejectionReason } = req.body;
        if (!certificateHash || !status) {
            return res.status(400).json({
                success: false,
                message: "certificateHash and status are required"
            });
        }

        const certificate = await updateCertificateStatusService(
            certificateHash,
            status,
            txHash,
            rejectionReason
        );

        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: "Certificate not found"
            });
        }

        res.status(200).json({
            success: true,
            message: `Certificate status updated to ${status}`,
            certificate
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

