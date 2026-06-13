// middleware/auth.js
// ─────────────────────────────────────────────────────────────────────────────
// Public-facing re-export shim.
// The canonical implementation lives at:
//   backend/src/middleware/authMiddleware.js
//
// Naming aliases:
//   protect              ← authenticate   (JWT verification + req.user attachment)
//   authorize(...roles)  ← authorise      (RBAC factory, returns 403 if role not allowed)
//   optionalProtect      ← optionalAuthenticate (silent auth for public routes)
//
// Usage in routes:
//   const { protect, authorize } = require('../middleware/auth');
//   router.get('/admin', protect, authorize('admin'), handler);
// ─────────────────────────────────────────────────────────────────────────────

const {
  authenticate,
  authorise,
  optionalAuthenticate,
} = require('../src/middleware/authMiddleware');

module.exports = {
  // Primary alias used throughout the spec
  protect:          authenticate,
  authorize:        authorise,

  // Additional exports (same implementations, original names)
  authenticate,
  authorise,
  optionalProtect:  optionalAuthenticate,
  optionalAuthenticate,
};
