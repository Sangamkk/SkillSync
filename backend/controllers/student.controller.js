import * as StudentService from "../services/student.service.js";

export const getProfile = async (req, res) => {

    try {

        const user = await StudentService.getProfile(req.user.id);

        return res.status(200).json({
            success: true,
            user,
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }

};