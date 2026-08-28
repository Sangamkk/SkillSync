import express from "express";

import {
    uploadCertificate,
    getStudentCertificates,
    getCandidateCertificates,
    getCertificateByHash,
    getCertificateDocument,
    updateCertificateStatus
} from "../controllers/certificate.controller.js";
import upload from "../config/multer.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/upload", upload.single("certificate"), authenticate, authorizeRoles("STUDENT"), uploadCertificate);

router.get("/hash/:hash", authenticate, authorizeRoles("ORGANISATION", "STUDENT", "ADMIN"), getCertificateByHash);
router.get("/document/:hash", authenticate, authorizeRoles("ORGANISATION", "STUDENT", "ADMIN"), getCertificateDocument);
router.get("/students/:studentId", authenticate, authorizeRoles("ORGANISATION"), getCandidateCertificates);
router.get("/:studentId", authenticate, authorizeRoles("STUDENT"), getStudentCertificates);


router.put("/status", authenticate, authorizeRoles("ORGANISATION", "ADMIN"), updateCertificateStatus);

export default router;