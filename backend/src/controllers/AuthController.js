// Controller: AuthController.js
// Business logic for user registration, login, token refresh, and logout.
// All async operations use try/catch for structured error handling.

const bcrypt   = require("bcryptjs");
const UserModel  = require("../models/UserModel");
const TokenModel = require("../models/TokenModel");
const { setCache } = require("../config/redis");
const { ApiError } = require("../utils/ApiError");
const { sendResponse } = require("../utils/ApiResponse");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  compareToken,
  getRefreshTokenExpiry,
} = require("../utils/jwtUtils");

/**
 * AuthController
 * Handles all authentication-related HTTP requests.
 */
const AuthController = {
  /**
   * register
   * POST /api/auth/register
   * Creates a new user account after validating uniqueness.
   * Automatically logs the user in by returning tokens.
   */
  register: async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;

      // Check for duplicate email before hashing (fast DB check)
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        throw new ApiError(409, "An account with this email already exists");
      }

      // Hash the password using bcrypt (12 rounds for strong security)
      const passwordHash = await bcrypt.hash(password, 12);

      // Prevent external actors from self-assigning admin role
      const safeRole = role === "instructor" ? "instructor" : "student";

      const user = await UserModel.create({ name, email, passwordHash, role: safeRole });

      // Issue tokens immediately after registration (auto-login UX)
      const accessToken  = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Hash and persist the refresh token
      const tokenHash = await hashToken(refreshToken);
      await TokenModel.save({
        userId:    user.id,
        tokenHash,
        expiresAt: getRefreshTokenExpiry(),
      });

      return sendResponse(res, 201, "Account created successfully", {
        user:         { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * login
   * POST /api/auth/login
   * Authenticates a user by email + password.
   * Issues a new access/refresh token pair on success.
   */
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Fetch user WITH password_hash (special findByEmail query)
      const user = await UserModel.findByEmail(email);
      if (!user || !user.is_active) {
        throw new ApiError(401, "Invalid email or password");
      }

      // Constant-time password comparison to prevent timing attacks
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        throw new ApiError(401, "Invalid email or password");
      }

      const accessToken  = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      const tokenHash = await hashToken(refreshToken);
      await TokenModel.save({
        userId:    user.id,
        tokenHash,
        expiresAt: getRefreshTokenExpiry(),
      });

      return sendResponse(res, 200, "Login successful", {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * refreshToken
   * POST /api/auth/refresh
   * Validates a refresh token, rotates it, and issues a new access token.
   * Old refresh token is revoked after successful rotation.
   */
  refreshToken: async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new ApiError(400, "Refresh token is required");
      }

      // Verify JWT signature and expiry first
      let decoded;
      try {
        decoded = verifyRefreshToken(refreshToken);
      } catch {
        throw new ApiError(401, "Invalid or expired refresh token");
      }

      // Fetch all active tokens for this user and find a hash match
      const storedTokens = await TokenModel.findByUserId(decoded.id);
      let matchedToken   = null;

      for (const stored of storedTokens) {
        const isMatch = await compareToken(refreshToken, stored.token_hash);
        if (isMatch) {
          matchedToken = stored;
          break;
        }
      }

      if (!matchedToken) {
        // Possible token reuse attack — revoke all tokens for this user
        await TokenModel.revokeAllForUser(decoded.id);
        throw new ApiError(401, "Refresh token not recognised. All sessions have been terminated");
      }

      // Revoke the used refresh token (token rotation)
      await TokenModel.revoke(matchedToken.id);

      const user = await UserModel.findById(decoded.id);
      if (!user) {
        throw new ApiError(401, "User not found");
      }

      // Issue new token pair
      const newAccessToken  = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      const newHash = await hashToken(newRefreshToken);
      await TokenModel.save({
        userId:    user.id,
        tokenHash: newHash,
        expiresAt: getRefreshTokenExpiry(),
      });

      return sendResponse(res, 200, "Token refreshed successfully", {
        accessToken:  newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * logout
   * POST /api/auth/logout
   * Blacklists the current access token in Redis (TTL = token expiry).
   * Revokes all refresh tokens for the user.
   */
  logout: async (req, res, next) => {
    try {
      const token = req.headers.authorization.split(" ")[1];

      // Blacklist the access token until it naturally expires
      // Access token lifetime is max 15 minutes so TTL is short
      const accessTokenTTL = 15 * 60; // 15 minutes in seconds
      await setCache(`blacklist:${token}`, true, accessTokenTTL);

      // Revoke all refresh tokens for complete logout
      await TokenModel.revokeAllForUser(req.user.id);

      return sendResponse(res, 200, "Logged out successfully");
    } catch (err) {
      next(err);
    }
  },

  /**
   * getMe
   * GET /api/auth/me
   * Returns the currently authenticated user's profile.
   */
  getMe: async (req, res, next) => {
    try {
      return sendResponse(res, 200, "User profile retrieved", req.user);
    } catch (err) {
      next(err);
    }
  },

  /**
   * changePassword
   * PUT /api/auth/change-password
   * Validates the current password then updates it.
   * Revokes all existing refresh tokens (force re-login on all devices).
   */
  changePassword: async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await UserModel.findByEmail(req.user.email);
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        throw new ApiError(400, "Current password is incorrect");
      }

      if (currentPassword === newPassword) {
        throw new ApiError(400, "New password must differ from the current password");
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      await UserModel.updatePassword(req.user.id, newHash);
      await TokenModel.revokeAllForUser(req.user.id);

      return sendResponse(res, 200, "Password changed successfully. Please log in again");
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AuthController;
