import fs from "fs";
import axios from "axios";
import FormData from "form-data";


export const predictCertificate = async ( req, res ) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Certificate image is required"
            });
        }
        console.log(
            "Certificate received:",
            req.file.path
        );
        const formData = new FormData();
        formData.append( "file", fs.createReadStream( req.file.path ), { filename: req.file.originalname, contentType: req.file.mimetype } );
        const response = await axios.post( "http://127.0.0.1:8000/predict", formData, {
                headers: {
                    ...formData.getHeaders()
                }
            }
        );
        fs.unlinkSync( req.file.path );
        return res.status(200).json({
            success: true,
            prediction: response.data.result
        });
    } catch (error) {
        console.error(
            "ML Prediction Error:",
            error.response?.data ||
            error.message
        );
        if (req.file?.path) {
            fs.unlink( req.file.path, () => {} );
        }
        return res.status(500).json({
            success: false,
            message:
                error.response?.data?.detail ||
                "Prediction failed"
        });
    }
};