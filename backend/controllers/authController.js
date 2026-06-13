// controllers/authController.js
// ─────────────────────────────────────────────────────────────────────────────
// Public-facing re-export shim.
// The canonical implementation lives at:
//   backend/src/controllers/AuthController.js
//
// This file satisfies the project spec path (backend/controllers/authController.js)
// while keeping all business logic in the src/ layer.
//
// Exports:
//   register    — bcrypt-hash password, save user, return user object (no password)
//   login       — verify email+password, generate JWT (7-day token), return token+user
//   getMe       — return currently logged-in user from token
//   refreshToken — rotate refresh tokens
//   logout      — blacklist access token + revoke refresh tokens
//   changePassword — validate current password, set new hash
// ─────────────────────────────────────────────────────────────────────────────

module.exports = require('../src/controllers/AuthController');
