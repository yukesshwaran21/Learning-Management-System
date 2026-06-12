// Utils: ApiResponse.js
// Standardised success response factory.
// Ensures a consistent JSON envelope across all endpoints.

/**
 * ApiResponse
 * Wraps any data payload in a standard success envelope.
 *
 * Shape:
 * {
 *   "success": true,
 *   "message": "...",
 *   "data": { ... },
 *   "pagination": { ... }  // optional
 * }
 */
class ApiResponse {
  /**
   * @param {number} statusCode  - HTTP status code
   * @param {string} message     - Human-readable success message
   * @param {any}    [data]      - Response payload
   * @param {object} [pagination]- Pagination metadata
   */
  constructor(statusCode, message, data = null, pagination = null) {
    this.statusCode = statusCode;
    this.success    = true;
    this.message    = message;
    if (data !== null)       this.data       = data;
    if (pagination !== null) this.pagination  = pagination;
  }
}

/**
 * sendResponse
 * Convenience function to send an ApiResponse directly.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {any}    [data]
 * @param {object} [pagination]
 */
const sendResponse = (res, statusCode, message, data = null, pagination = null) => {
  const response = new ApiResponse(statusCode, message, data, pagination);
  return res.status(statusCode).json(response);
};

/**
 * buildPagination
 * Builds a pagination metadata object from query params and total count.
 *
 * @param {number} page
 * @param {number} limit
 * @param {number} total
 * @returns {{ page, limit, total, totalPages, hasNextPage, hasPrevPage }}
 */
const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages:  Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

module.exports = { ApiResponse, sendResponse, buildPagination };
