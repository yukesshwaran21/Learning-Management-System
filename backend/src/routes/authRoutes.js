// Routes: authRoutes.js
// Registers all authentication-related HTTP endpoints.
// Business logic lives exclusively in AuthController — not here.

const express = require("express");
const AuthController = require("../controllers/AuthController");
const { authenticate } = require("../middleware/authMiddleware");
const {
  validateRegister,
  validateLogin,
} = require("../middleware/validationMiddleware");

const router = express.Router();

// POST   /api/auth/register        — Create a new user account
router.post("/register", validateRegister, AuthController.register);

// POST   /api/auth/login           — Authenticate and receive tokens
router.post("/login", validateLogin, AuthController.login);

// POST   /api/auth/refresh         — Exchange refresh token for new access token
router.post("/refresh", AuthController.refreshToken);

// POST   /api/auth/logout          — Invalidate current session (requires auth)
router.post("/logout", authenticate, AuthController.logout);

// GET    /api/auth/me              — Get current user profile (requires auth)
router.get("/me", authenticate, AuthController.getMe);

// PUT    /api/auth/change-password — Change password (requires auth)
router.put("/change-password", authenticate, AuthController.changePassword);

module.exports = router;
