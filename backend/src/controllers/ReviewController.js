// Controller: ReviewController.js
// Handles creating, updating, and deleting course reviews.
// Only enrolled students may submit reviews.

const ReviewModel     = require("../models/ReviewModel");
const EnrollmentModel = require("../models/EnrollmentModel");
const CourseModel     = require("../models/CourseModel");
const { ApiError }    = require("../utils/ApiError");
const { sendResponse, buildPagination } = require("../utils/ApiResponse");
const { deletePattern } = require("../config/redis");

/**
 * ReviewController
 * Business logic for the /api/reviews endpoint.
 */
const ReviewController = {
  /**
   * getCourseReviews
   * GET /api/reviews/course/:courseId
   * Paginated list of reviews for a given course.
   */
  getCourseReviews: async (req, res, next) => {
    try {
      const { courseId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const { reviews, total } = await ReviewModel.findByCourse(courseId, {
        page:  parseInt(page),
        limit: parseInt(limit),
      });

      const pagination = buildPagination(parseInt(page), parseInt(limit), total);
      return sendResponse(res, 200, "Reviews retrieved", reviews, pagination);
    } catch (err) {
      next(err);
    }
  },

  /**
   * createReview
   * POST /api/reviews/course/:courseId
   * Creates a review only if the student is enrolled and hasn't reviewed yet.
   */
  createReview: async (req, res, next) => {
    try {
      const { courseId } = req.params;
      const { rating, comment } = req.body;

      // Verify student is enrolled in the course
      const enrollment = await EnrollmentModel.findByStudentAndCourse({
        studentId: req.user.id,
        courseId,
      });
      if (!enrollment) {
        throw new ApiError(403, "You must be enrolled in this course to leave a review");
      }

      // Prevent duplicate reviews
      const existing = await ReviewModel.findByStudentAndCourse({
        studentId: req.user.id,
        courseId,
      });
      if (existing) {
        throw new ApiError(409, "You have already reviewed this course");
      }

      const review = await ReviewModel.create({
        courseId,
        studentId: req.user.id,
        rating:    parseInt(rating),
        comment,
      });

      // Recalculate course rating stats
      await CourseModel.updateStats(courseId);
      await deletePattern(`course:*`);

      return sendResponse(res, 201, "Review submitted successfully", review);
    } catch (err) {
      next(err);
    }
  },

  /**
   * updateReview
   * PUT /api/reviews/:reviewId
   * Allows the review owner to update their review.
   */
  updateReview: async (req, res, next) => {
    try {
      const { reviewId } = req.params;
      const { rating, comment } = req.body;

      const existing = await ReviewModel.findByStudentAndCourse({
        studentId: req.user.id,
        courseId:  req.body.courseId,
      });

      // Fetch the review directly to check ownership
      const { pool } = require("../config/database");
      const { rows } = await pool.query("SELECT * FROM reviews WHERE id = $1", [reviewId]);
      const review = rows[0];

      if (!review) throw new ApiError(404, "Review not found");
      if (review.student_id !== req.user.id && req.user.role !== "admin") {
        throw new ApiError(403, "You can only edit your own reviews");
      }

      const updated = await ReviewModel.update(reviewId, {
        rating: rating ? parseInt(rating) : undefined,
        comment,
      });

      await CourseModel.updateStats(review.course_id);
      await deletePattern("course:*");

      return sendResponse(res, 200, "Review updated", updated);
    } catch (err) {
      next(err);
    }
  },

  /**
   * deleteReview
   * DELETE /api/reviews/:reviewId
   * Deletes a review (owner or admin only).
   */
  deleteReview: async (req, res, next) => {
    try {
      const { reviewId } = req.params;

      const { pool } = require("../config/database");
      const { rows } = await pool.query("SELECT * FROM reviews WHERE id = $1", [reviewId]);
      const review = rows[0];

      if (!review) throw new ApiError(404, "Review not found");
      if (review.student_id !== req.user.id && req.user.role !== "admin") {
        throw new ApiError(403, "You can only delete your own reviews");
      }

      await ReviewModel.delete(reviewId);
      await CourseModel.updateStats(review.course_id);
      await deletePattern("course:*");

      return sendResponse(res, 200, "Review deleted");
    } catch (err) {
      next(err);
    }
  },
};

module.exports = ReviewController;
