import * as StudentService from "../services/student.service.js";

export const getProfile = async (req, res) => {

    try {
        console.log("123...",req.user);
        console.log("123...",req.query);
        const {walletAddress} = req.query;
        const user = await StudentService.getProfile(walletAddress);

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