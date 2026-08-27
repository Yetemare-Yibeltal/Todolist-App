import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import cluster from "cluster";
import os from "os";
import { app } from "./app";
import { env, isDevelopment, isProduction } from "./config/env";
import { connectDB } from "./config/database";
import { logger } from "./utils/logger";
import { redisClient } from "./config/redis";
import { setupSocketHandlers } from "./sockets/socket.handlers";
import { errorHandler } from "./middleware/error.middleware";
import { performance } from "perf_hooks";
import { createWorkerPool } from "./workers/worker.pool";
import { setupQueueProcessors } from "./queues/queue.processors";
import { initializeCronJobs } from "./cron/cron.jobs";
import { setupHealthChecks } from "./health/health.checks";
import { setupMetrics } from "./metrics/metrics.collector";
import { backupService } from "./services/backup.service";
import { cacheService } from "./services/cache.service";
import { emailService } from "./services/email.service";

const PORT = env.PORT;
const HOST = env.HOST;

let server: any = null;
let socketIO: any = null;
let workerPool: any = null;
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

  process.on("SIGHUP", () => {
    logger.info("SIGHUP signal received: reloading configuration");
    reloadConfiguration();
  });

  process.on("exit", (code: number) => {
    logger.info(`Process exiting with code: ${code}`);
  });
}

async function initializeServer() {
  try {
    logger.info("🚀 Starting TodoList API Server...");
    const startTime = performance.now();

    await connectDB();
    logger.info("✅ MongoDB connected successfully");

    await redisClient.connect();
    logger.info("✅ Redis connected successfully");

    await cacheService.initialize();
    logger.info("✅ Cache service initialized");

    await emailService.initialize();
    logger.info("✅ Email service initialized");

    await setupQueueProcessors();
    logger.info("✅ Queue processors initialized");

    await initializeCronJobs();
    logger.info("✅ Cron jobs initialized");

    await setupHealthChecks();
    logger.info("✅ Health checks initialized");

    await setupMetrics();
    logger.info("✅ Metrics collector initialized");

    if (env.BACKUP_ENABLED) {
      await backupService.initialize();
      logger.info("✅ Backup service initialized");
    }

    const httpServer = createServer(app);
    server = httpServer;

    httpServer.on("connection", (connection) => {
      connections.add(connection);
      connection.on("close", () => {
        connections.delete(connection);
      });
    });

    if (env.WS_ENABLED) {
      const pubClient = createClient({ url: env.REDIS_URL });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);

      socketIO = new SocketServer(httpServer, {
        path: env.WS_PATH,
        cors: {
          origin: env.WS_CORS_ORIGIN.split(","),
          methods: ["GET", "POST"],
          credentials: true,
        },
        pingInterval: env.WS_PING_INTERVAL,
        pingTimeout: env.WS_PING_TIMEOUT,
        maxHttpBufferSize: env.WS_MAX_HTTP_BUFFER_SIZE,
        transports: ["websocket", "polling"],
        allowEIO3: true,
      });

      socketIO.adapter(createAdapter(pubClient, subClient));
      setupSocketHandlers(socketIO);
      logger.info("✅ WebSocket server initialized");
    }

    if (env.QUEUE_ENABLED) {
      workerPool = createWorkerPool({
        concurrency: env.QUEUE_CONCURRENCY,
        retryAttempts: env.QUEUE_RETRY_ATTEMPTS,
        retryDelay: env.QUEUE_RETRY_DELAY,
        stalledInterval: env.QUEUE_STALLED_INTERVAL,
        maxStalledCount: env.QUEUE_MAX_STALLED_COUNT,
      });
      await workerPool.initialize();
      logger.info("✅ Worker pool initialized");
    }

    httpServer.listen(PORT, HOST, () => {
      const startupTime = ((performance.now() - startTime) / 1000).toFixed(2);
      logger.info(`✅ Server started successfully in ${startupTime}s`);
      logger.info(`📍 Server is running on http://${HOST}:${PORT}`);
      logger.info(
        `📍 API Documentation: http://${HOST}:${PORT}${env.API_PREFIX}/${env.API_VERSION}/docs`,
      );
      logger.info(`📍 Health Check: http://${HOST}:${PORT}/health`);
      logger.info(`📍 Metrics: http://${HOST}:${PORT}/metrics`);
      logger.info(`📍 Environment: ${env.NODE_ENV}`);
      logger.info(`📍 WebSocket: ${env.WS_ENABLED ? "Enabled" : "Disabled"}`);
      logger.info(`📍 Queue: ${env.QUEUE_ENABLED ? "Enabled" : "Disabled"}`);
      logger.info(`📍 Cache: ${env.CACHE_ENABLED ? "Enabled" : "Disabled"}`);
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

    app.use(errorHandler);

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
        external: Math.round(memoryUsage.external / 1024 / 1024) + "MB",
        arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024) + "MB",
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000) + "ms",
        system: Math.round(cpuUsage.system / 1000) + "ms",
      },
      uptime: Math.round(process.uptime()) + "s",
      connections: connections.size,
      activeHandles: (process as any)._getActiveHandles().length,
      activeRequests: (process as any)._getActiveRequests().length,
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
    if (socketIO) {
      logger.info("Closing WebSocket server...");
      await new Promise((resolve) => {
        socketIO.close(() => {
          logger.info("✅ WebSocket server closed");
          resolve(null);
        });
      });
    }

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

    if (workerPool) {
      logger.info("Closing worker pool...");
      await workerPool.shutdown();
      logger.info("✅ Worker pool closed");
    }

    logger.info("Closing database connections...");
    await Promise.all([
      redisClient.quit(),
      // Add other database connections here
    ]);
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

async function reloadConfiguration() {
  try {
    logger.info("🔄 Reloading configuration...");

    const newEnv = await import("./config/env");
    Object.assign(env, newEnv.env);

    await cacheService.clear();
    logger.info("✅ Cache cleared after configuration reload");

    logger.info("✅ Configuration reloaded successfully");
  } catch (error: any) {
    logger.error("Failed to reload configuration:", {
      error: error.message,
      stack: error.stack,
    });
  }
}

function enableClustering() {
  const numCPUs = os.cpus().length;

  if (cluster.isPrimary) {
    logger.info(`Primary ${process.pid} is running with ${numCPUs} workers`);

    for (let i = 0; i < numCPUs; i++) {
      const worker = cluster.fork();
      logger.info(`Worker ${worker.process.pid} started`);
    }

    cluster.on("exit", (worker, code, signal) => {
      logger.warn(
        `Worker ${worker.process.pid} died (${signal || code}). Restarting...`,
      );
      const newWorker = cluster.fork();
      logger.info(`New worker ${newWorker.process.pid} started`);
    });

    cluster.on("online", (worker) => {
      logger.info(`Worker ${worker.process.pid} is online`);
    });

    cluster.on("disconnect", (worker) => {
      logger.warn(`Worker ${worker.process.pid} disconnected`);
    });

    process.on("SIGUSR2", () => {
      logger.info("Received SIGUSR2. Restarting workers...");
      for (const id in cluster.workers) {
        const worker = cluster.workers[id];
        if (worker) {
          worker.kill("SIGTERM");
        }
      }
    });
  } else {
    logger.info(`Worker ${process.pid} started`);
    initializeServer();
  }
}

if (isProduction && env.WORKERS_ENABLED) {
  enableClustering();
} else {
  initializeServer();
}

export { server, socketIO };

process.stdin.resume();

process.on("beforeExit", (code) => {
  logger.info(`Process beforeExit with code: ${code}`);
});

process.on("warning", (warning) => {
  logger.warn("Process warning:", {
    name: warning.name,
    message: warning.message,
    stack: warning.stack,
  });
});
