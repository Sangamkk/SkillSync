import * as authService from "../services/authService.js";

export const register = async (req, res) => {
  try {
    const response = await authService.register(req.body);

    res.status(201).json({
      message: "Registration Successful",
      ...response,
    });
  } catch (error) {
    console.log("this is from Auth Register Controller");
    res.status(400).json({
      message: error.message,
      
    });
  }
};

export const login = async (req, res) => {
  try {
    const data = await authService.login(req.body);
    console.log(data,"-->from AuthLogin Controller.")

    res.status(200).json(data);
  } catch (error) {
    console.log("this is from Auth Login Controller");
    res.status(400).json({
      message: error.message,
    });
  }
};