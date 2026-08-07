import express from "express";

import {
    uploadCertificate,
    getStudentCertificates,
    getCertificateByHash
} from "../controllers/certificate.controller.js";
import upload from "../config/multer.js";

const router = express.Router();

router.post("/upload",upload.single("certificate"), uploadCertificate);

router.get("/:studentId", getStudentCertificates);

router.get("/hash/:hash",getCertificateByHash);

export default router;