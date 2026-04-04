import jwt from "jsonwebtoken";
import { verifyAuthToken } from "../utils/jwtHelper.js";
import { createHttpError } from "../utils/httpError.js";

const unauthorizedError = (message) => createHttpError(401, message);

const extractBearerToken = (authorizationHeader = "") => {
  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const authenticate = (req, res, next) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return next(unauthorizedError("Missing token"));
  }

  const token = extractBearerToken(authorizationHeader);

  if (!token) {
    return next(unauthorizedError("Invalid token format"));
  }

  try {
    const decoded = verifyAuthToken(token);

    if (!decoded.userId || !decoded.role) {
      return next(unauthorizedError("Invalid token"));
    }

    req.user = {
      id: decoded.userId,
      role: decoded.role,
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(unauthorizedError("Token expired"));
    }

    return next(unauthorizedError("Invalid token"));
  }
};

export default authenticate;
