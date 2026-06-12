// app.js
// Express application factory.
// Configures all middleware and mounts route prefixes.
// Separated from server.js to simplify testing.

require("dotenv").config();
require("express-async-errors");

const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const compression  = require("compression");
const morgan       = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit    = require("express-rate-limit");
const logger       = require("./config/logger");

// ── Route Imports ────────────────────────────────
const authRoutes       = require("./routes/authRoutes");
const courseRoutes     = require("./routes/courseRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const reviewRoutes     = require("./routes/reviewRoutes");
const userRoutes       = require("./routes/userRoutes");

// ── Error Middleware ────────────────────────────
const {
  notFoundHandler,
  globalErrorHandler,
} = require("./middleware/errorMiddleware");

const app = express();

// ──────────────────────────────────────────────
// Security Headers (Helmet)
// ──────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // Allow Cloudinary video embeds
  })
);

// ──────────────────────────────────────────────
// CORS Configuration
// Allows the React frontend to call this API.
// ──────────────────────────────────────────────
app.use(
  cors({
    origin:      process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods:     ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ──────────────────────────────────────────────
// Global Rate Limiter
// 100 requests per 15 minutes per IP address.
// ──────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { success: false, message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders:   false,
});

// Stricter rate limit for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, message: "Too many auth attempts. Please wait 15 minutes." },
});

app.use("/api", globalLimiter);
app.use("/api/auth/login",    authLimiter);
app.use("/api/auth/register", authLimiter);

// ──────────────────────────────────────────────
// Body Parsing & Compression
// ──────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(compression());

// ──────────────────────────────────────────────
// HTTP Request Logging (Morgan → Winston)
// ──────────────────────────────────────────────
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.http(message.trim()) },
    skip:   (req) => req.url === "/api/health",
  })
);

// ──────────────────────────────────────────────
// Health Check Endpoint
// ──────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LMS API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ──────────────────────────────────────────────
// API Route Registration
// ──────────────────────────────────────────────
app.use("/api/auth",        authRoutes);
app.use("/api/courses",     courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/reviews",     reviewRoutes);
app.use("/api/users",       userRoutes);

// ──────────────────────────────────────────────
// Error Handling (must be registered last)
// ──────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
