import User from "../models/User.js"

export const getProfile = async (walletAddress) => {
    try {
        console.log("Searching:", walletAddress);
        const user = await User.findOne({ walletAddress }).select("-password");;
        console.log(user);
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    } catch (error) {
        console.error("Service Error:", error);
        throw error;
    }

};