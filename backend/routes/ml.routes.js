import express from "express";
import multer from "multer";

import {
    predictCertificate,extractCertificate
} from "../controllers/ml.controller.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post( "/predict", upload.single("file"), predictCertificate );
router.post( "/:certificateId/predict", authenticate,authorizeRoles("ORGANISATION"), predictCertificate);
router.post( "/:certificateId/extract", authenticate, authorizeRoles("ORGANISATION"), extractCertificate);

export default router;