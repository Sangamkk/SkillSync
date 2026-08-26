import {
    uploadCertificateService,
    getStudentCertificatesService,
    getCertificateByHashService
} from "../services/certificate.services.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import crypto from "crypto";
import Application from "../models/Application.js";
import OrganisationApplication from "../models/OrganisationApplication.js";


const uploadToCloudinary = (buffer, originalName) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(

            {
                resource_type: "raw",
                type: "upload",
                access_mode: "public",
                folder: "SkillSync/Certificates",
                use_filename: true,
                unique_filename: true,
                filename_override: originalName
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

const getRawPublicId = (certificateURL) => {
    const parsedURL = new URL(certificateURL);
    const marker = "/raw/upload/";
    const markerIndex = parsedURL.pathname.indexOf(marker);

    if (markerIndex === -1) {
        throw new Error("Stored certificate URL is not a raw Cloudinary resource");
    }

    const pathAfterUpload = parsedURL.pathname.slice(markerIndex + marker.length);
    return decodeURIComponent(pathAfterUpload.replace(/^v\d+\//, ""));
};

export const uploadCertificate = async (req, res) => {

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No certificate uploaded"
            });
        }
        console.log("Certificate upload input:", {
            mimetype: req.file.mimetype,
            originalName: req.file.originalname,
            size: req.file.size,
        });
        const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
        console.log("Certificate Cloudinary upload:", {
            resourceType: result.resource_type,
            format: result.format,
            secureUrl: result.secure_url,
        });

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

export const getCandidateCertificates = async (req, res) => {
    try {
        const { studentId } = req.params;
        const application = await Application.findOne({
            student: studentId,
            organisation: req.user.userId,
        }).select("_id").lean();

        if (!application) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to view this candidate's certificates",
            });
        }

        const certificates = await getStudentCertificatesService(studentId);
        return res.status(200).json({ success: true, certificates });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch candidate certificates",
            certificates: [],
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

export const getCertificateDocument = async (req, res) => {
    try {
        const certificate = await getCertificateByHashService(req.params.hash);

        if (!certificate?.certificateURL) {
            return res.status(404).json({
                success: false,
                message: "Certificate document not found",
            });
        }

        if (req.user.role === "STUDENT") {
            if (String(certificate.student) !== String(req.user.userId)) {
                return res.status(403).json({
                    success: false,
                    message: "You are not allowed to view this certificate document",
                });
            }
        } else if (req.user.role === "ORGANISATION") {
            const organisation = await OrganisationApplication.findOne({
                _id: req.user.userId,
                status: "Approved",
            }).select("organisationName").lean();

            if (!organisation || organisation.organisationName !== certificate.issuer) {
                return res.status(403).json({
                    success: false,
                    message: "You are not allowed to view this certificate document",
                });
            }
        }

        const publicId = getRawPublicId(certificate.certificateURL);
        const downloadURL = cloudinary.utils.private_download_url(
            publicId,
            undefined,
            { resource_type: "raw", type: "upload" }
        );
        const documentResponse = await fetch(downloadURL);
        if (!documentResponse.ok) {
            return res.status(502).json({
                success: false,
                message: "Certificate document could not be retrieved",
            });
        }

        const contentType = documentResponse.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("pdf")) {
            return res.status(502).json({
                success: false,
                message: `Certificate resource is not a PDF (${contentType || "unknown content type"})`,
            });
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
        res.send(Buffer.from(await documentResponse.arrayBuffer()));
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve certificate document",
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

