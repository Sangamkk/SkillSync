import axios from "axios";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import { v4 as uuidv4 } from "uuid";

import Certificate from "../models/Certificate.js";
import cloudinary from "../config/cloudinary.js"; // adjust path if needed
import { getRawPublicId } from "../utils/cloudinaryUtils.js"; // adjust path if needed


export const predictCertificate = async (req, res) => {

    let tempFilePath = null;

    try {

        console.log("========== ML PREDICTION ==========");

        const { certificateId } = req.params;

        console.log(
            "Certificate ID received:",
            certificateId
        );


        // 1. Find certificate from MongoDB

        const certificate =
            await Certificate.findById(certificateId);


        if (!certificate) {

            return res.status(404).json({
                success: false,
                message: "Certificate not found"
            });

        }


        console.log(
            "Certificate found:",
            certificate._id
        );

        console.log(
            "Certificate URL:",
            certificate.certificateURL
        );


        // 2. Extract Cloudinary public ID

        const publicId = getRawPublicId(
            certificate.certificateURL
        );


        console.log(
            "Cloudinary Public ID:",
            publicId
        );


        // 3. Generate signed Cloudinary download URL

        const downloadURL =
            cloudinary.utils.private_download_url(

                publicId,

                undefined,

                {
                    resource_type: "raw",
                    type: "upload"
                }

            );


        console.log(
            "Signed download URL generated"
        );
        console.log("Signed Download URL:", downloadURL);


        // 4. Download certificate from Cloudinary

        const fileResponse =
            await axios.get(

                downloadURL,

                {
                    responseType: "arraybuffer"
                }

            );


        console.log(
            "Certificate downloaded successfully"
        );


        // 5. Create uploads directory

        const uploadsDir =
            path.join(
                process.cwd(),
                "uploads"
            );


        if (!fs.existsSync(uploadsDir)) {

            fs.mkdirSync(
                uploadsDir,
                {
                    recursive: true
                }
            );

        }


        // 6. Get original file extension

        const fileExtension =
            path.extname(
                new URL(
                    certificate.certificateURL
                ).pathname
            ) || ".pdf";


        const fileName =
            `${uuidv4()}${fileExtension}`;


        tempFilePath =
            path.join(
                uploadsDir,
                fileName
            );


        // 7. Save temporarily

        fs.writeFileSync(
            tempFilePath,
            fileResponse.data
        );


        console.log(
            "Temporary file created:",
            tempFilePath
        );


        // 8. Create multipart form

        const formData =
            new FormData();


        formData.append(

            "file",

            fs.createReadStream(
                tempFilePath
            ),

            {
                filename: fileName
            }

        );


        console.log(
            "Sending certificate to ML service..."
        );


        // 9. Send certificate to FastAPI

        const mlResponse =
            await axios.post(

                "http://127.0.0.1:8000/predict",

                formData,

                {
                    headers:
                        formData.getHeaders(),

                    maxContentLength:
                        Infinity,

                    maxBodyLength:
                        Infinity
                }

            );


        console.log(
            "ML prediction received:"
        );

        console.log(
            mlResponse.data
        );


        // 10. Return result

        return res.status(200).json({

            success: true,

            certificateId:
                certificate._id,

            prediction:
                mlResponse.data.result

        });


    } catch (error) {

        console.log(
            "========== ML PREDICTION ERROR =========="
        );

        console.log(
            "Error message:",
            error.message
        );

        console.log(
            "Error status:",
            error.response?.status
        );

        console.log(
            "Error data:",
            error.response?.data
        );


        return res.status(500).json({

            success: false,

            message:
                error.response?.data?.detail ||
                error.message ||
                "Prediction failed"

        });


    } finally {

        // Always delete temporary file

        if (
            tempFilePath &&
            fs.existsSync(tempFilePath)
        ) {

            fs.unlinkSync(
                tempFilePath
            );

            console.log(
                "Temporary file deleted"
            );

        }

    }

};

export const extractCertificate = async (req, res) => {

    let tempFilePath = null;

    try {

        console.log(
            "========== CERTIFICATE EXTRACTION =========="
        );

        const { certificateId } = req.params;

        console.log(
            "Certificate ID received:",
            certificateId
        );


        // 1. Find certificate in MongoDB

        const certificate =
            await Certificate.findById(certificateId);


        if (!certificate) {

            return res.status(404).json({
                success: false,
                message: "Certificate not found"
            });

        }


        console.log(
            "Certificate found:",
            certificate._id
        );


        // 2. Get Cloudinary public ID

        const publicId =
            getRawPublicId(
                certificate.certificateURL
            );


        console.log(
            "Cloudinary Public ID:",
            publicId
        );


        // 3. Generate signed Cloudinary URL

        const downloadURL =
            cloudinary.utils.private_download_url(
                publicId,
                undefined,
                {
                    resource_type: "raw",
                    type: "upload"
                }
            );


        console.log(
            "Signed download URL generated"
        );


        // 4. Download certificate

        const fileResponse =
            await axios.get(
                downloadURL,
                {
                    responseType: "arraybuffer"
                }
            );


        console.log(
            "Certificate downloaded successfully"
        );


        // 5. Create temporary file

        const uploadsDir =
            path.join(
                process.cwd(),
                "uploads"
            );


        if (!fs.existsSync(uploadsDir)) {

            fs.mkdirSync(
                uploadsDir,
                {
                    recursive: true
                }
            );

        }


        const fileExtension =
            path.extname(
                new URL(
                    certificate.certificateURL
                ).pathname
            ) || ".pdf";


        const fileName =
            `${uuidv4()}${fileExtension}`;


        tempFilePath =
            path.join(
                uploadsDir,
                fileName
            );


        fs.writeFileSync(
            tempFilePath,
            fileResponse.data
        );


        console.log(
            "Temporary certificate created:",
            tempFilePath
        );


        // 6. Create multipart form

        const formData =
            new FormData();


        formData.append(
            "file",
            fs.createReadStream(
                tempFilePath
            ),
            {
                filename: fileName
            }
        );


        console.log(
            "Sending certificate to ML extraction service..."
        );


        // 7. Send to FastAPI

        const mlResponse =
            await axios.post(

                "http://127.0.0.1:8000/extract",

                formData,

                {
                    headers:
                        formData.getHeaders(),

                    maxContentLength:
                        Infinity,

                    maxBodyLength:
                        Infinity
                }

            );


        console.log(
            "Extraction result received:"
        );

        console.log(
            mlResponse.data
        );


        // 8. Delete temporary file

        if (
            tempFilePath &&
            fs.existsSync(tempFilePath)
        ) {

            fs.unlinkSync(
                tempFilePath
            );

            console.log(
                "Temporary certificate deleted"
            );

        }


        // 9. Send result to frontend

        return res.status(200).json({

            success: true,

            certificateId:
                certificate._id,

            extraction:
                mlResponse.data.result

        });


    } catch (error) {

        console.log(
            "========== EXTRACTION ERROR =========="
        );

        console.log(
            "Error message:",
            error.message
        );

        console.log(
            "Error status:",
            error.response?.status
        );

        console.log(
            "Error data:",
            error.response?.data
        );


        // Delete temporary file even if extraction fails

        if (
            tempFilePath &&
            fs.existsSync(tempFilePath)
        ) {

            fs.unlinkSync(
                tempFilePath
            );

        }


        return res.status(500).json({

            success: false,

            message:
                error.response?.data?.detail ||
                "Certificate extraction failed"

        });

    }

};