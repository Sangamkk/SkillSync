import {
    uploadCertificateService,
    getStudentCertificatesService
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

        const certificate = await uploadCertificateService({
            student: req.body.student,

            certificateName: req.body.certificateName,
            issuer: req.body.issuer,
            certificateType: req.body.certificateType,
            issueDate: req.body.issueDate,
            expiryDate: req.body.expiryDate,
            description: req.body.description,

            // Temporary
            certificateURL: result.secure_url,
            certificateHash: hashBytes32
        });


        // Generate SHA-256 Hash


        console.log("SHA-256 Hash :", hashHex);

        console.log("Bytes32 Hash :", hashBytes32);

        res.status(200).json({

            success: true,

            message: "Hash Generated Successfully",

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

        const certificates = await getStudentCertificatesService(
            req.params.studentId
        );

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