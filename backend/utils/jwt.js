import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  const userId = user?._id?.toString() || user?.userId?.toString();

  return jwt.sign(
    {
      _id: userId,
      userId,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );
};