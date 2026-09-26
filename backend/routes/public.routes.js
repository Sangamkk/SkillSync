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

// Public — no auth required
// POST /api/public/verify-document
router.post("/verify-document", upload.single("file"), verifyDocument);

export default router;
