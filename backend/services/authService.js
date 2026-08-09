import bcrypt from "bcrypt";
import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";

export const register = async (userData) => {
  const {
    name,
    email,
    password,
    role,
    walletAddress,
    usn,
    college,
    organizationName,
    companyName,
  } = userData;

  try {
    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
      throw new Error("Email already exists");
    }

    const existingWallet = await User.findOne({ walletAddress });

    if (existingWallet) {
      throw new Error("Wallet already registered");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      walletAddress,
      usn,
      college,
      organizationName,
      companyName,
    });

    return { user };
  } catch (error) {
    console.error( "Registration service error:", error );
    throw error;
  }

};



export const login = async (loginData) => {
  const { email, password, walletAddress } = loginData;

  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("User not found");
  }

  const isPasswordCorrect = await bcrypt.compare(
    password,
    user.password
  );

  if (!isPasswordCorrect) {
    throw new Error("Invalid Password");
  }

  if (user.walletAddress !== walletAddress) {
    throw new Error("Wallet does not match");
  }

  const token = generateToken(user);
  console.log(user,"-->from AuthLogin Service.")
  return {
    message: "Login Successful",
    token,
    user,
  };
};