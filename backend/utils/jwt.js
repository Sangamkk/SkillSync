import jwt from "jsonwebtoken";

export const generateToken = (user) => {
    const userId = user?._id || user?.userId;

    return jwt.sign(
        {
            _id: userId,
            userId,
            role: user.role,
            walletAddress: user.walletAddress
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1d"
        }
    );
};