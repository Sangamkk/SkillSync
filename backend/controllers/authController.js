import * as authService from "../services/authService.js";

export const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);

    return res.status(201).json(result);
  } catch (error) {
    console.error("[AUTH REGISTER ERROR]:", error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);

    return res.status(200).json(result);
  } catch (error) {
    console.error("[AUTH LOGIN ERROR]:", error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};