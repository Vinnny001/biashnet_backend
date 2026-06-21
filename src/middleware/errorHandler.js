import { IS_PRODUCTION } from "../config/constants.js";
import { logger } from "../utils/logger.js";

export function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || error.status || 500;

  if (statusCode >= 500) {
    logger.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
    details: error.details || undefined,
    stack: IS_PRODUCTION ? undefined : error.stack
  });
}
