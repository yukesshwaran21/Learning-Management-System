// Routes: reviewRoutes.js
// Course review endpoints.

const express = require("express");
const ReviewController = require("../controllers/ReviewController");
const { authenticate } = require("../middleware/authMiddleware");
const { validateReview } = require("../middleware/validationMiddleware");

const router = express.Router();

// GET    /api/reviews/course/:courseId   — Get paginated reviews for a course
router.get("/course/:courseId", ReviewController.getCourseReviews);

// POST   /api/reviews/course/:courseId  — Submit a review (enrolled student only)
router.post(
  "/course/:courseId",
  authenticate,
  validateReview,
  ReviewController.createReview
);

// PUT    /api/reviews/:reviewId         — Update own review
router.put("/:reviewId", authenticate, validateReview, ReviewController.updateReview);

// DELETE /api/reviews/:reviewId         — Delete own review (or admin)
router.delete("/:reviewId", authenticate, ReviewController.deleteReview);

module.exports = router;
