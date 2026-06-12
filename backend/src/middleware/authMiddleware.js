// Middleware: authMiddleware.js
// Verifies the JWT access token on every protected route.
// Attaches the decoded user payload to req.user for downstream use.

const jwt = require("jsonwebtoken");
const { getCache } = require("../config/redis");
const UserModel = require("../models/UserModel");
const { ApiError } = require("../utils/ApiError");

/**
 * authenticate
 * Middleware that validates the Bearer JWT from the Authorization header.
 * Blacklisted tokens (after logout) are rejected via Redis lookup.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Access token is missing or malformed");
    }

    const token = authHeader.split(" ")[1];

    // Check if the token has been blacklisted (logged-out token)
    const isBlacklisted = await getCache(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new ApiError(401, "Token has been invalidated. Please log in again");
    }

    // Verify signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure the user still exists and is active
    const user = await UserModel.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, "User account not found or deactivated");
    }

    // Attach user context to the request object
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new ApiError(401, "Access token has expired"));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new ApiError(401, "Invalid access token"));
    }
    next(err);
  }
};

/**
 * authorise
 * Role-based access control factory.
 * Returns a middleware that allows only the specified roles.
 *
 * Usage: router.get('/admin-only', authenticate, authorise('admin'), handler)
 *
 * @param {...string} roles - Allowed roles ('admin' | 'instructor' | 'student')
 * @returns {import('express').RequestHandler}
 */
const authorise = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access denied. Required role(s): [${roles.join(", ")}]`
        )
      );
    }
    next();
  };
};

/**
 * optionalAuthenticate
 * Tries to authenticate without failing if no token is present.
 * Used for routes that show different content to logged-in users.
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // No token — continue without user context
    }

    const token = authHeader.split(" ")[1];
    const isBlacklisted = await getCache(`blacklist:${token}`);
    if (!isBlacklisted) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await UserModel.findById(decoded.id);
      if (user) req.user = user;
    }
  } catch {
    // Silently ignore auth errors in optional mode
  }
  next();
};

module.exports = { authenticate, authorise, optionalAuthenticate };
