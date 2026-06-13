// routes/authRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// Public-facing re-export shim.
// The canonical Express router lives at:
//   backend/src/routes/authRoutes.js
//
// Registered routes:
//   POST  /api/auth/register         — Create account (hashed password, auto-login)
//   POST  /api/auth/login            — Authenticate, receive access + refresh tokens
//   GET   /api/auth/me               — Protected: return current user from token
//   POST  /api/auth/refresh          — Rotate refresh token, issue new access token
//   POST  /api/auth/logout           — Blacklist access token, revoke refresh tokens
//   PUT   /api/auth/change-password  — Protected: update password, force re-login
// ─────────────────────────────────────────────────────────────────────────────

module.exports = require('../src/routes/authRoutes');
