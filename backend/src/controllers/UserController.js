// Controller: UserController.js
// Admin-level user management and profile update endpoints.

const UserModel   = require("../models/UserModel");
const { deleteFromCloudinary } = require("../config/cloudinary");
const { ApiError } = require("../utils/ApiError");
const { sendResponse, buildPagination } = require("../utils/ApiResponse");

/**
 * UserController
 * Handles user profile management and admin user CRUD.
 */
const UserController = {
  /**
   * getProfile
   * GET /api/users/profile
   * Returns the authenticated user's full profile.
   */
  getProfile: async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) throw new ApiError(404, "User not found");
      return sendResponse(res, 200, "Profile retrieved", user);
    } catch (err) {
      next(err);
    }
  },

  /**
   * updateProfile
   * PUT /api/users/profile
   * Allows a user to update their name, bio, and avatar.
   */
  updateProfile: async (req, res, next) => {
    try {
      const { name, bio } = req.body;
      let avatarUrl = undefined;

      // Handle avatar upload
      if (req.file) {
        const currentUser = await UserModel.findById(req.user.id);
        // Delete the old avatar from Cloudinary if it exists
        if (currentUser && currentUser.avatar_url) {
          const publicId = currentUser.avatar_url.split("/").pop().split(".")[0];
          await deleteFromCloudinary(`lms/images/${publicId}`).catch(() => {});
        }
        avatarUrl = req.file.path;
      }

      const updated = await UserModel.update(req.user.id, { name, bio, avatarUrl });
      if (!updated) throw new ApiError(404, "User not found");

      return sendResponse(res, 200, "Profile updated successfully", updated);
    } catch (err) {
      next(err);
    }
  },

  // ────────────────── ADMIN-ONLY ───────────────────────────

  /**
   * getAllUsers
   * GET /api/users
   * Paginated list of all users with optional role/search filters.
   * Admin only.
   */
  getAllUsers: async (req, res, next) => {
    try {
      const { page = 1, limit = 20, role, search } = req.query;

      const { users, total } = await UserModel.findAll({
        page:  parseInt(page),
        limit: parseInt(limit),
        role,
        search,
      });

      const pagination = buildPagination(parseInt(page), parseInt(limit), total);
      return sendResponse(res, 200, "Users retrieved", users, pagination);
    } catch (err) {
      next(err);
    }
  },

  /**
   * getUserById
   * GET /api/users/:id
   * Fetches a single user by ID. Admin only.
   */
  getUserById: async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.params.id);
      if (!user) throw new ApiError(404, "User not found");
      return sendResponse(res, 200, "User retrieved", user);
    } catch (err) {
      next(err);
    }
  },

  /**
   * deleteUser
   * DELETE /api/users/:id
   * Soft-deletes a user account. Admin only.
   * Cannot delete yourself.
   */
  deleteUser: async (req, res, next) => {
    try {
      const { id } = req.params;

      if (id === req.user.id) {
        throw new ApiError(400, "You cannot delete your own account via this endpoint");
      }

      const deleted = await UserModel.softDelete(id);
      if (!deleted) throw new ApiError(404, "User not found");

      return sendResponse(res, 200, "User deactivated successfully");
    } catch (err) {
      next(err);
    }
  },

  /**
   * getDashboardStats
   * GET /api/users/admin/stats
   * Returns aggregate statistics for the admin dashboard.
   */
  getDashboardStats: async (req, res, next) => {
    try {
      const { pool } = require("../config/database");

      const statsQuery = `
        SELECT
          (SELECT COUNT(*) FROM users        WHERE is_active = TRUE)                           AS total_users,
          (SELECT COUNT(*) FROM users        WHERE role = 'instructor' AND is_active = TRUE)   AS total_instructors,
          (SELECT COUNT(*) FROM users        WHERE role = 'student'    AND is_active = TRUE)   AS total_students,
          (SELECT COUNT(*) FROM courses      WHERE status = 'published')                       AS total_courses,
          (SELECT COUNT(*) FROM enrollments  WHERE status = 'active')                          AS total_enrollments,
          (SELECT COUNT(*) FROM enrollments  WHERE status = 'completed')                       AS total_completions
      `;

      const { rows } = await pool.query(statsQuery);
      return sendResponse(res, 200, "Dashboard stats retrieved", rows[0]);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = UserController;
