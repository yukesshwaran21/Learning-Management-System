// Middleware: errorMiddleware.js
// Global error handler and 404 handler for the Express application.
// All unhandled errors flow through here before a response is sent.

const logger = require("../config/logger");
const { ApiError } = require("../utils/ApiError");

/**
 * notFoundHandler
 * Catches requests that didn't match any registered route
 * and forwards a standardised 404 ApiError.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * globalErrorHandler
 * Catches all errors forwarded via next(err).
 * Differentiates between operational ApiErrors and unexpected crashes.
 *
 * @param {Error} err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
// eslint-disable-next-line no-unused-vars
const globalErrorHandler = (err, req, res, _next) => {
  // Operational errors we threw intentionally
  if (err instanceof ApiError) {
    logger.warn(`[${err.statusCode}] ${req.method} ${req.originalUrl} — ${err.message}`);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  // PostgreSQL unique-constraint violation (e.g. duplicate email)
  if (err.code === "23505") {
    logger.warn("DB unique constraint violation:", err.detail);
    return res.status(409).json({
      success: false,
      message: "A record with the given value already exists",
      detail: err.detail,
    });
  }

  // PostgreSQL foreign-key constraint violation
  if (err.code === "23503") {
    return res.status(400).json({
      success: false,
      message: "Referenced resource does not exist",
    });
  }

  // Multer file-size exceeded
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "File size exceeds the allowed limit",
    });
  }

  // JWT errors (should be caught in authMiddleware, but just in case)
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  // Unknown / programmer errors
  logger.error(`[500] Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "An internal server error occurred"
      : err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

module.exports = { notFoundHandler, globalErrorHandler };
