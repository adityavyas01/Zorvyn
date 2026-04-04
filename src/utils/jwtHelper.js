import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/index.js";

const TOKEN_EXPIRY = "15m";

export const generateAuthToken = ({ userId, role }) => {
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.sign({ userId, role }, jwtSecret, {
    expiresIn: TOKEN_EXPIRY,
  });
};

export const verifyAuthToken = (token) => {
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.verify(token, jwtSecret);
};
