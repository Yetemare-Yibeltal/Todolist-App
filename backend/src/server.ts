import app from "./app";
import { config } from "./config/env";
import database from "./config/database";
import logger from "./utils/logger";

const server = app.listen(config.PORT, async () => {
  try {
    // Connect to database
    await database.connect();

    // Test database connection
    const health = await database.healthCheck();
    if (health.status === "ok") {
      logger.info(`Database connection healthy (${health.latency}ms)`);
    }

    logger.info(`🚀 Server running on port ${config.PORT}`);
    logger.info(`📚 Environment: ${config.NODE_ENV}`);
    logger.info(
      `🔗 API URL: http://localhost:${config.PORT}/api/${config.API_VERSION}`,
    );
    logger.info(`❤️ Health check: http://localhost:${config.PORT}/health`);
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info("HTTP server closed");

    try {
      await database.disconnect();
      logger.info("Database connection closed");
      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown:", error);
      process.exit(1);
    }
  });

  // Force shutdown after timeout
  setTimeout(() => {
    logger.error("Forced shutdown due to timeout");
    process.exit(1);
  }, 10000);
};

// Handle termination signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason);
  shutdown("unhandledRejection");
});

export default server;
