import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import * as StudentService from "../services/student.service.js";

import mongoose from "mongoose";
import User from "../models/User.js";

const router = express.Router();

/**
 * GET /api/students/lookup/:identifier
 * Lookup student summary by MongoDB _id, applicantId, email, or usn.
 * Accessible to organisations and admins.
 */
router.get(
  "/lookup/:identifier",
  authenticate,
  authorizeRoles("ORGANISATION", "ADMIN"),
  async (req, res) => {
    try {
      const { identifier } = req.params;
      const cleanId = (identifier || "").trim();
      let student = null;

      if (mongoose.Types.ObjectId.isValid(cleanId)) {
        student = await User.findById(cleanId)
          .select("name email applicantId usn college")
          .lean();
      }

      if (!student) {
        student = await User.findOne({
          $or: [
            { applicantId: cleanId },
            { email: cleanId.toLowerCase() },
            { usn: cleanId.toUpperCase() },
          ],
        })
          .select("name email applicantId usn college")
          .lean();
      }

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found with provided ID or Email",
        });
      }

      return res.status(200).json({
        success: true,
        student,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

/**
 * GET /api/students/:studentId/profile
 * Returns another student's professional profile.
 * Accessible to organisations (who have the student as an applicant).
 */
router.get(
  "/:studentId/profile",
  authenticate,
  authorizeRoles("ORGANISATION", "STUDENT", "ADMIN"),
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const profile = await StudentService.getFullProfile(studentId);
      return res.status(200).json({ success: true, ...profile });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

export default router;
