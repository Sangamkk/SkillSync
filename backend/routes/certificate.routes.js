import express from "express";

import {
    uploadCertificate,
    getStudentCertificates,
    getCertificateByHash
} from "../controllers/certificate.controller.js";
import upload from "../config/multer.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";


const router = express.Router();

router.post("/upload",upload.single("certificate"),authenticate,authorizeRoles("STUDENT"), uploadCertificate);

router.get("/:studentId",authenticate,authorizeRoles("STUDENT"),getStudentCertificates);

router.get("/hash/:hash",authenticate,authorizeRoles("ORGANISATION"),getCertificateByHash);

export default router;