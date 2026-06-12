// server.js
// Application entry point.
// Connects to PostgreSQL and Redis before starting the HTTP server.
// Handles graceful shutdown on SIGTERM / SIGINT.

require("dotenv").config();

const app    = require("./app");
const { testDatabaseConnection } = require("./config/database");
const { redis }  = require("./config/redis");
const logger = require("./config/logger");

const PORT = process.env.PORT || 5000;

/**
 * startServer
 * Bootstraps all external connections then starts the HTTP listener.
 */
const startServer = async () => {
  try {
    // 1. Verify PostgreSQL is reachable
    await testDatabaseConnection();

    // 2. Verify Redis is reachable (ping)
    await redis.ping();
    logger.info("✅ Redis ping successful");

    // 3. Start the HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 LMS API server running on port ${PORT} [${process.env.NODE_ENV}]`);
      logger.info(`📖 Health check: http://localhost:${PORT}/api/health`);
    });

    // ──────────────────────────────────────────────
    // GracefulShutdown
    // Closes open connections before process exits.
    // ──────────────────────────────────────────────
    const gracefulShutdown = async (signal) => {
      logger.info(`\n[${signal}] Graceful shutdown initiated...`);
      server.close(async () => {
        try {
          await redis.quit();
          logger.info("✅ Redis connection closed");
        } catch {}
        logger.info("✅ HTTP server closed. Process exiting.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT",  () => gracefulShutdown("SIGINT"));

    // Catch unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
    });

  } catch (err) {
    logger.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
