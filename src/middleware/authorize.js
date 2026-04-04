import { createHttpError } from "../utils/httpError.js";
import logger from "../utils/logger.js";

const forbiddenError = (message = "Insufficient permissions") => {
  return createHttpError(403, message);
};

const buildRbacDenialLogContext = (req, allowedRoles, reason) => {
  return {
    event: "rbac_denial",
    reason,
    userId: req.user?.id || null,
    userRole: req.user?.role || null,
    allowedRoles,
    method: req.method || "",
    path: (req.originalUrl || req.path || "").split("?")[0],
    resourceId: req.params?.id || null,
    ip: req.ip || "",
  };
};

const authorizeRoles = (...roles) => {
  const allowedRoles = roles.filter(Boolean);

  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      logger.warn(
        "RBAC denial",
        buildRbacDenialLogContext(req, allowedRoles, "missing_user_role")
      );
      return next(forbiddenError());
    }

    if (allowedRoles.length === 0) {
      logger.warn(
        "RBAC denial",
        buildRbacDenialLogContext(req, allowedRoles, "missing_allowed_roles")
      );
      return next(forbiddenError());
    }

    if (!allowedRoles.includes(userRole)) {
      logger.warn(
        "RBAC denial",
        buildRbacDenialLogContext(req, allowedRoles, "role_not_allowed")
      );
      return next(forbiddenError());
    }

    return next();
  };
};

export default authorizeRoles;
