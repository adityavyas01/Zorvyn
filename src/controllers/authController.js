import { loginUser, registerUser } from "../services/authService.js";
import { successResponse } from "../utils/response.js";

export const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);

    res.status(201);
    return successResponse(
      res,
      {
        user,
      },
      "User registered successfully"
    );
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const authResult = await loginUser(req.body);

    return successResponse(res, authResult, "Login successful");
  } catch (error) {
    return next(error);
  }
};
