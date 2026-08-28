import { createServer } from "http";
import { app } from "./app";
import { env, isDevelopment } from "./config/env";
import { connectDB } from "./config/database";
import { logger } from "./utils/logger";
import { redisClient, connectRedis } from "./config/redis";
import { errorMiddleware } from "./middleware/error.middleware";

const PORT = env.PORT;
const HOST = env.HOST;

let server: any = null;
let shutdownInProgress = false;
const connections = new Set<any>();

function setupProcessHandlers() {
  process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught Exception:", {
      error: error.message,
      stack: error.stack,
    });
    if (!isDevelopment) {
      gracefulShutdown(1);
    }
  });

  process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    logger.error("Unhandled Rejection:", {
      reason: reason?.message || reason,
      promise,
    });
    if (!isDevelopment) {
      gracefulShutdown(1);
    }
  });

  process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received: closing HTTP server");
    gracefulShutdown(0);
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT signal received: closing HTTP server");
    gracefulShutdown(0);
  });

  process.on("exit", (code: number) => {
    logger.info(`Process exiting with code: ${code}`);
  });
}

async function initializeServer() {
  try {
    logger.info("🚀 Starting TodoList API Server...");

    await connectDB();
    logger.info("✅ MongoDB connected successfully");

    await connectRedis();
    logger.info("✅ Redis connected successfully");

    const httpServer = createServer(app);
    server = httpServer;

    httpServer.on("connection", (connection) => {
      connections.add(connection);
      connection.on("close", () => {
        connections.delete(connection);
      });
    });

    httpServer.listen(PORT, HOST, () => {
      logger.info(`✅ Server started successfully`);
      logger.info(`📍 Server is running on http://${HOST}:${PORT}`);
      logger.info(`📍 Health Check: http://${HOST}:${PORT}/health`);
      logger.info(`📍 Environment: ${env.NODE_ENV}`);
    });

    httpServer.on("error", (error: any) => {
      logger.error("Server error:", { error: error.message, code: error.code });
      if (error.code === "EADDRINUSE") {
        logger.error(
          `Port ${PORT} is already in use. Please free the port or change PORT in .env`,
        );
        gracefulShutdown(1);
      } else {
        gracefulShutdown(1);
      }
    });

    app.use(errorMiddleware.handle());

    setupProcessHandlers();
    startPerformanceMonitoring();
  } catch (error: any) {
    logger.error("Failed to initialize server:", {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
    gracefulShutdown(1);
  }
}

function startPerformanceMonitoring() {
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    logger.debug("Performance metrics:", {
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + "MB",
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + "MB",
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + "MB",
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000) + "ms",
        system: Math.round(cpuUsage.system / 1000) + "ms",
      },
      uptime: Math.round(process.uptime()) + "s",
      connections: connections.size,
    });
  }, 60000);
}

async function gracefulShutdown(exitCode: number = 0) {
  if (shutdownInProgress) {
    logger.warn("Shutdown already in progress...");
    return;
  }

  shutdownInProgress = true;
  logger.info("🛑 Starting graceful shutdown...");

  const timeout = setTimeout(() => {
    logger.error("Forced shutdown due to timeout");
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT);

  try {
    if (server) {
      logger.info("Closing HTTP server...");
      await new Promise((resolve, reject) => {
        server.close((err: any) => {
          if (err) {
            reject(err);
          } else {
            logger.info("✅ HTTP server closed");
            resolve(null);
          }
        });
      });
    }

    logger.info("Closing database connections...");
    try {
      await redisClient().quit();
    } catch (err) {
      // Ignore Redis quit errors
    }
    logger.info("✅ Database connections closed");

    logger.info("Closing remaining connections...");
    for (const connection of connections) {
      connection.destroy();
    }
    connections.clear();

    logger.info("✅ Graceful shutdown completed successfully");
    clearTimeout(timeout);
    process.exit(exitCode);
  } catch (error: any) {
    logger.error("Error during graceful shutdown:", {
      error: error.message,
      stack: error.stack,
    });
    clearTimeout(timeout);
    process.exit(1);
  }
}

initializeServer();

export { server };
