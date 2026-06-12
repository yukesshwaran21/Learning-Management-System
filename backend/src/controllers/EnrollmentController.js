// Controller: EnrollmentController.js
// Business logic for course enrollment and lesson progress tracking.

const EnrollmentModel = require("../models/EnrollmentModel");
const CourseModel     = require("../models/CourseModel");
const { ApiError }    = require("../utils/ApiError");
const { sendResponse, buildPagination } = require("../utils/ApiResponse");

/**
 * EnrollmentController
 * Handles enrollment and progress-related HTTP requests.
 */
const EnrollmentController = {
  /**
   * enroll
   * POST /api/enrollments/:courseId
   * Enrolls the authenticated student in a published course.
   * Free courses are enrolled immediately; paid courses require payment (stub).
   */
  enroll: async (req, res, next) => {
    try {
      const { courseId } = req.params;

      // Validate the course exists and is published
      const course = await CourseModel.findById(courseId);
      if (!course) {
        throw new ApiError(404, "Course not found");
      }
      if (course.status !== "published") {
        throw new ApiError(400, "This course is not available for enrollment");
      }

      // Check for existing enrollment
      const existing = await EnrollmentModel.findByStudentAndCourse({
        studentId: req.user.id,
        courseId,
      });
      if (existing) {
        throw new ApiError(409, "You are already enrolled in this course");
      }

      // Paid course guard (payment integration stub)
      if (parseFloat(course.price) > 0) {
        // TODO: Integrate payment gateway (Stripe/Razorpay) before enrolling
        throw new ApiError(402, "Payment required to enroll in this course");
      }

      const enrollment = await EnrollmentModel.enroll({
        studentId: req.user.id,
        courseId,
      });

      // Update the enrolled_count on the course
      await CourseModel.updateStats(courseId);

      return sendResponse(res, 201, "Successfully enrolled in the course", enrollment);
    } catch (err) {
      next(err);
    }
  },

  /**
   * getMyEnrollments
   * GET /api/enrollments/my
   * Returns all courses the authenticated student is enrolled in.
   */
  getMyEnrollments: async (req, res, next) => {
    try {
      const enrollments = await EnrollmentModel.findByStudent(req.user.id);
      return sendResponse(res, 200, "Your enrollments retrieved", enrollments);
    } catch (err) {
      next(err);
    }
  },

  /**
   * getCourseEnrollments
   * GET /api/enrollments/course/:courseId
   * Lists all students enrolled in a course (instructor/admin only).
   */
  getCourseEnrollments: async (req, res, next) => {
    try {
      const { courseId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const course = await CourseModel.findById(courseId);
      if (!course) throw new ApiError(404, "Course not found");

      // Only the course's instructor or an admin can view enrollments
      if (req.user.role !== "admin" && course.instructor_id !== req.user.id) {
        throw new ApiError(403, "Access denied");
      }

      const { enrollments, total } = await EnrollmentModel.findByCourse(courseId, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      const pagination = buildPagination(parseInt(page), parseInt(limit), total);
      return sendResponse(res, 200, "Course enrollments retrieved", enrollments, pagination);
    } catch (err) {
      next(err);
    }
  },

  /**
   * markLessonComplete
   * POST /api/enrollments/:courseId/lessons/:lessonId/complete
   * Marks a lesson as completed and recalculates course progress.
   */
  markLessonComplete: async (req, res, next) => {
    try {
      const { courseId, lessonId } = req.params;
      const { watchedDuration = 0 } = req.body;

      // Confirm the student is enrolled in this course
      const enrollment = await EnrollmentModel.findByStudentAndCourse({
        studentId: req.user.id,
        courseId,
      });
      if (!enrollment) {
        throw new ApiError(403, "You are not enrolled in this course");
      }

      // Validate the lesson belongs to this course
      const lesson = await CourseModel.findLessonById(lessonId);
      if (!lesson) {
        throw new ApiError(404, "Lesson not found");
      }

      // Mark the lesson as complete
      await EnrollmentModel.markLessonComplete({
        enrollmentId: enrollment.id,
        lessonId,
        watchedDuration: parseInt(watchedDuration),
      });

      // Recalculate overall course progress
      const updatedEnrollment = await EnrollmentModel.updateProgress(enrollment.id);

      return sendResponse(res, 200, "Lesson marked as complete", {
        progress:    updatedEnrollment.progress,
        status:      updatedEnrollment.status,
        completedAt: updatedEnrollment.completed_at,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * getCourseProgress
   * GET /api/enrollments/:courseId/progress
   * Returns the detailed lesson-level progress for a student.
   */
  getCourseProgress: async (req, res, next) => {
    try {
      const { courseId } = req.params;

      const enrollment = await EnrollmentModel.findByStudentAndCourse({
        studentId: req.user.id,
        courseId,
      });
      if (!enrollment) {
        throw new ApiError(403, "You are not enrolled in this course");
      }

      const progress = await EnrollmentModel.getProgressForEnrollment(enrollment.id);

      return sendResponse(res, 200, "Course progress retrieved", {
        overallProgress: enrollment.progress,
        status:          enrollment.status,
        lessons:         progress,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = EnrollmentController;
