import express from "express";

import {
    uploadCertificate,
    getMyCertificates,
    getStudentCertificates,
    getCandidateCertificates,
    getCertificateByHash,
    getCertificateDocument,
    updateCertificateStatus,
    issueCertificate,
    revokeCertificate,
} from "../controllers/certificate.Controller.js";
import upload from "../config/multer.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Student uploads own certificate PDF (no blockchain yet)
router.post(
    "/upload",
    authenticate,
    authorizeRoles("STUDENT"),
    upload.single("certificate"),
    uploadCertificate
);

const certificateUpload = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err) return next(err);
        if (req.files && req.files.length > 0) {
            req.file =
                req.files.find((f) => f.fieldname === "certificate") ||
                req.files.find((f) => f.fieldname === "file") ||
                req.files[0];
        }
        next();
    });
};

// Organisation issues certificate directly to student (blockchain write)
router.post(
    "/issue",
    authenticate,
    authorizeRoles("ORGANISATION"),
    certificateUpload,
    issueCertificate
);

// Student gets their own certificates (from JWT)
router.get(
    "/my",
    authenticate,
    authorizeRoles("STUDENT"),
    getMyCertificates
);

// Get certificate by hash (public-ish — used for verification)
router.get(
    "/hash/:hash",
    authenticate,
    authorizeRoles("ORGANISATION", "STUDENT", "ADMIN"),
    getCertificateByHash
);

// Stream certificate document PDF
router.get(
    "/document/:hash",
    authenticate,
    authorizeRoles("ORGANISATION", "STUDENT", "ADMIN"),
    getCertificateDocument
);

// Organisation, Student (self), or Admin gets candidate's certificates
router.get(
    "/students/:studentId",
    authenticate,
    authorizeRoles("ORGANISATION", "STUDENT", "ADMIN"),
    getCandidateCertificates
);

// Update certificate verification status (ORG/ADMIN)
router.put(
    "/status",
    authenticate,
    authorizeRoles("ORGANISATION", "ADMIN"),
    updateCertificateStatus
);

// Revoke a certificate (ORG/ADMIN — performs blockchain revoke)
router.post(
    "/:certificateId/revoke",
    authenticate,
    authorizeRoles("ORGANISATION", "ADMIN"),
    revokeCertificate
);

// Student gets certificates by studentId param (backward compat)
// NOTE: This route must come AFTER specific routes above to avoid conflicts
router.get(
    "/:studentId",
    authenticate,
    authorizeRoles("STUDENT"),
    getStudentCertificates
);

export default router;