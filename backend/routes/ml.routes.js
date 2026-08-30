import express from "express";
import multer from "multer";

import {
    predictCertificate
} from "../controllers/ml.controller.js";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post( "/predict", upload.single("file"), predictCertificate );

export default router;