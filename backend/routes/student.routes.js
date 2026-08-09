import express from "express";

import { getProfile } from "../controllers/student.controller.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();
router.get("/profile",authenticate,authorizeRoles("STUDENT"), getProfile);

export default router;