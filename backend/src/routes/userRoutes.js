// Routes: userRoutes.js
// User profile and admin management endpoints.

const express = require("express");
const UserController = require("../controllers/UserController");
const { authenticate, authorise } = require("../middleware/authMiddleware");
const { uploadImage } = require("../config/cloudinary");

const router = express.Router();

// GET  /api/users/profile          — Get own profile
router.get("/profile", authenticate, UserController.getProfile);

// PUT  /api/users/profile          — Update own profile (avatar upload supported)
router.put(
  "/profile",
  authenticate,
  uploadImage,
  UserController.updateProfile
);

// ──────────────────────────────────────────────
// Admin-Only Routes
// ──────────────────────────────────────────────

// GET  /api/users/admin/stats      — Aggregate dashboard stats
router.get(
  "/admin/stats",
  authenticate,
  authorise("admin"),
  UserController.getDashboardStats
);

// GET  /api/users                  — List all users (with filters)
router.get(
  "/",
  authenticate,
  authorise("admin"),
  UserController.getAllUsers
);

// GET  /api/users/:id              — Get a specific user by ID
router.get(
  "/:id",
  authenticate,
  authorise("admin"),
  UserController.getUserById
);

// DELETE /api/users/:id            — Soft-delete a user
router.delete(
  "/:id",
  authenticate,
  authorise("admin"),
  UserController.deleteUser
);

module.exports = router;
