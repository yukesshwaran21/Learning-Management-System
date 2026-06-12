// Utils: ApiError.js
// Custom error class for operational (expected) API errors.
// Distinguishes them from programmer errors in the global error handler.

/**
 * ApiError
 * Operational error that carries an HTTP status code.
 * Throw this class anywhere in controllers/services to produce
 * a structured JSON error response.
 */
class ApiError extends Error {
  /**
   * @param {number}   statusCode - HTTP status code (4xx / 5xx)
   * @param {string}   message    - Human-readable error message
   * @param {object[]} [errors]   - Optional array of field-level errors
   */
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors     = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { ApiError };
