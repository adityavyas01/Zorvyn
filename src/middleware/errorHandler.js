import { errorResponse } from "../utils/response.js";
import logger from "../utils/logger.js";

const resolveStatusCode = (error) => {
  const statusCode = error?.statusCode ?? error?.status;

  if ([400, 401, 403].includes(statusCode)) {
    return statusCode;
  }

  if (statusCode >= 400 && statusCode < 500) {
    return statusCode;
  }

  if (statusCode >= 500 && statusCode < 600) {
    return statusCode;
  }

  return 500;
};

const globalErrorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = resolveStatusCode(error);
  const message = statusCode === 500 ? "Internal server error" : error.message;
  const requestPath = (req.originalUrl || req.path || "").split("?")[0];

  logger.error("Request exception", {
    event: "exception",
    statusCode,
    errorMessage: error.message,
    stack: statusCode >= 500 ? error.stack : undefined,
    method: req.method || "",
    path: requestPath,
    userId: req.user?.id || null,
    ip: req.ip || "",
  });

  return errorResponse(res, message, statusCode);
};

export default globalErrorHandler;
