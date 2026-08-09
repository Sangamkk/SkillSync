import jwt from "jsonwebtoken";

export const generateToken = (user) => {

    return jwt.sign(
        {
            userId: user._id,
            role: user.role,
            walletAddress: user.walletAddress
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1d"
        }
    );
};