import Skill from "../models/skill.model.js";

export const getProfile = async (userId) => {

    const user = await User.findById(userId).select("-password");

    if (!user) {
        throw new Error("User not found");
    }

    return user;
};