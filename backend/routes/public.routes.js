import express from "express";
import upload from "../config/multer.js";
import {
    verifyCertificate,
    verifyDocument,
} from "../controllers/publicVerification.controller.js";

const router = express.Router();

// Public — no auth required
// GET /api/public/verify/:certificateId
router.get("/verify/:certificateId", verifyCertificate);

const documentUpload = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err) return next(err);
        if (req.files && req.files.length > 0) {
            req.file =
                req.files.find((f) => f.fieldname === "file" || f.fieldname === "certificate") ||
                req.files[0];
        }
        next();
    });
};

// Public — no auth required
// POST /api/public/verify-document
router.post("/verify-document", documentUpload, verifyDocument);

export default router;
