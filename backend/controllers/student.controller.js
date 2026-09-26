import * as StudentService from "../services/student.service.js";

// ─── GET /api/student/profile ──────────────────────────────────────────────────
/** Student gets their own profile. */
export const getProfile = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?._id;
        const user = await StudentService.getProfile(userId);

        return res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};

// ─── GET /api/student/profile/full ────────────────────────────────────────────
/** Student gets their full professional profile (certs + projects + employment). */
export const getFullProfile = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?._id;
        const profile = await StudentService.getFullProfile(userId);

        return res.status(200).json({
            success: true,
            ...profile,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};
