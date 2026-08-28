import { Router, Request, Response, NextFunction } from "express";
import os from "os";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { getDB, healthCheckDB } from "../config/database";
import { redisClient, isRedisReady } from "../config/redis";
import { emailService } from "../services/email.service";
import { notificationService } from "../services/notification.service";
import { performance } from "perf_hooks";
import { packageJson } from "../utils/package";

interface HealthCheck {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: {
      status: "healthy" | "unhealthy" | "degraded";
      latency: number;
      error?: string;
    };
    redis: {
      status: "healthy" | "unhealthy" | "degraded";
      latency: number;
      error?: string;
    };
    email: {
      status: "healthy" | "unhealthy" | "degraded";
      error?: string;
    };
    notification: {
      status: "healthy" | "unhealthy" | "degraded";
      error?: string;
    };
  };
  system: {
    cpu: {
      usage: number;
      cores: number;
      load: number[];
    };
    memory: {
      total: number;
      used: number;
      free: number;
      usagePercent: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
      usagePercent: number;
    };
    uptime: number;
    process: {
      pid: number;
      memory: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
      };
      cpu: {
        user: number;
        system: number;
      };
    };
  };
  dependencies: Record<
    string,
    {
      status: "healthy" | "unhealthy" | "degraded";
      version?: string;
      error?: string;
    }
  >;
  metrics: {
    requestsTotal: number;
    requestsPerMinute: number;
    avgResponseTime: number;
    errorRate: number;
    activeConnections: number;
  };
}

const router = Router();

// Store metrics
let requestCount = 0;
let errorCount = 0;
let totalResponseTime = 0;
let lastMinuteRequests = 0;
let lastMinuteStart = Date.now();

const requestCounter = (req: Request, res: Response, next: NextFunction) => {
  requestCount++;
  const start = performance.now();

  res.on("finish", () => {
    const duration = performance.now() - start;
    totalResponseTime += duration;

    if (res.statusCode >= 400) {
      errorCount++;
    }
  });

  next();
};

const updateMetrics = () => {
  const now = Date.now();
  if (now - lastMinuteStart > 60000) {
    lastMinuteRequests = 0;
    lastMinuteStart = now;
  }
  lastMinuteRequests++;
};

router.use(requestCounter);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is unhealthy
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const startTime = performance.now();

  try {
    const health: HealthCheck = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: packageJson.version || "1.0.0",
      environment: env.NODE_ENV || "development",
      services: {
        database: { status: "healthy", latency: 0 },
        redis: { status: "healthy", latency: 0 },
        email: { status: "healthy" },
        notification: { status: "healthy" },
      },
      system: {
        cpu: {
          usage: 0,
          cores: os.cpus().length,
          load: os.loadavg(),
        },
        memory: {
          total: os.totalmem(),
          used: os.totalmem() - os.freemem(),
          free: os.freemem(),
          usagePercent: 0,
        },
        disk: {
          total: 0,
          used: 0,
          free: 0,
          usagePercent: 0,
        },
        uptime: os.uptime(),
        process: {
          pid: process.pid,
          memory: {
            rss: process.memoryUsage().rss,
            heapTotal: process.memoryUsage().heapTotal,
            heapUsed: process.memoryUsage().heapUsed,
            external: process.memoryUsage().external,
          },
          cpu: {
            user: process.cpuUsage().user,
            system: process.cpuUsage().system,
          },
        },
      },
      dependencies: {},
      metrics: {
        requestsTotal: requestCount,
        requestsPerMinute: lastMinuteRequests,
        avgResponseTime:
          requestCount > 0 ? totalResponseTime / requestCount : 0,
        errorRate: requestCount > 0 ? (errorCount / requestCount) * 100 : 0,
        activeConnections: (process as any)._getActiveHandles().length || 0,
      },
    };

    // Check database
    try {
      const dbStart = performance.now();
      const dbHealth = await healthCheckDB();
      health.services.database.latency = dbHealth.latency;
      health.services.database.status = dbHealth.status as any;
      if (dbHealth.error) {
        health.services.database.error = dbHealth.error;
        health.status = "degraded";
      }
    } catch (error: any) {
      health.services.database.status = "unhealthy";
      health.services.database.error = error.message;
      health.status = "unhealthy";
    }

    // Check Redis
    try {
      const redisStart = performance.now();
      const redisReady = isRedisReady();
      const redisLatency = performance.now() - redisStart;

      health.services.redis.latency = redisLatency;
      health.services.redis.status = redisReady ? "healthy" : "degraded";

      if (!redisReady) {
        health.services.redis.error = "Redis is not ready";
        if (health.status === "healthy") health.status = "degraded";
      }
    } catch (error: any) {
      health.services.redis.status = "unhealthy";
      health.services.redis.error = error.message;
      health.status = "unhealthy";
    }

    // Check Email Service
    try {
      const emailConnected = emailService.isConnectedService();
      health.services.email.status = emailConnected ? "healthy" : "degraded";

      if (!emailConnected) {
        health.services.email.error = "Email service is not connected";
        if (health.status === "healthy") health.status = "degraded";
      }
    } catch (error: any) {
      health.services.email.status = "unhealthy";
      health.services.email.error = error.message;
      health.status = "unhealthy";
    }

    // Check Notification Service
    try {
      health.services.notification.status = "healthy";
    } catch (error: any) {
      health.services.notification.status = "unhealthy";
      health.services.notification.error = error.message;
      health.status = "unhealthy";
    }

    // System metrics
    health.system.memory.usagePercent =
      (health.system.memory.used / health.system.memory.total) * 100;

    const cpuUsage = os.loadavg()[0];
    health.system.cpu.usage = cpuUsage;

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    health.system.memory = {
      total: totalMem,
      used: totalMem - freeMem,
      free: freeMem,
      usagePercent: ((totalMem - freeMem) / totalMem) * 100,
    };

    // Dependencies
    try {
      const db = getDB();
      if (db) {
        health.dependencies.mongodb = {
          status: "healthy",
          version: "6.0",
        };
      }
    } catch (error: any) {
      health.dependencies.mongodb = {
        status: "unhealthy",
        error: error.message,
      };
    }

    try {
      health.dependencies.nodejs = {
        status: "healthy",
        version: process.version,
      };
    } catch (error: any) {
      health.dependencies.nodejs = {
        status: "unhealthy",
        error: error.message,
      };
    }

    // Determine final status
    const hasUnhealthy = Object.values(health.services).some(
      (s) => s.status === "unhealthy",
    );
    const hasDegraded = Object.values(health.services).some(
      (s) => s.status === "degraded",
    );

    if (hasUnhealthy) {
      health.status = "unhealthy";
    } else if (hasDegraded) {
      health.status = "degraded";
    } else {
      health.status = "healthy";
    }

    const duration = (performance.now() - startTime) / 1000;
    const statusCode =
      health.status === "healthy"
        ? 200
        : health.status === "degraded"
          ? 503
          : 503;

    res.status(statusCode).json(health);

    if (duration > 1) {
      logger.debug("Health check completed:", {
        duration: `${duration.toFixed(2)}s`,
        status: health.status,
      });
    }
  } catch (error: any) {
    logger.error("Health check error:", { error: error.message });
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get("/live", (req: Request, res: Response) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    pid: process.pid,
  });
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get("/ready", async (req: Request, res: Response) => {
  try {
    const checks = {
      database: false,
      redis: false,
    };

    // Check database
    try {
      const dbHealth = await healthCheckDB();
      checks.database = dbHealth.status === "healthy";
    } catch (error) {
      checks.database = false;
    }

    // Check Redis
    try {
      checks.redis = isRedisReady();
    } catch (error) {
      checks.redis = false;
    }

    const allReady = Object.values(checks).every((v) => v === true);

    if (allReady) {
      res.status(200).json({
        status: "ready",
        timestamp: new Date().toISOString(),
        checks,
      });
    } else {
      res.status(503).json({
        status: "not ready",
        timestamp: new Date().toISOString(),
        checks,
      });
    }
  } catch (error: any) {
    res.status(503).json({
      status: "not ready",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /health/metrics:
 *   get:
 *     summary: Get detailed metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 */
router.get("/metrics", (req: Request, res: Response) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    requests: {
      total: requestCount,
      perMinute: lastMinuteRequests,
      errors: errorCount,
      errorRate: requestCount > 0 ? (errorCount / requestCount) * 100 : 0,
    },
    response: {
      totalTime: totalResponseTime,
      averageTime: requestCount > 0 ? totalResponseTime / requestCount : 0,
    },
    system: {
      cpu: {
        usage: os.loadavg()[0],
        cores: os.cpus().length,
        load: os.loadavg(),
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
      },
      uptime: os.uptime(),
      process: {
        pid: process.pid,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        handles: (process as any)._getActiveHandles().length,
        requests: (process as any)._getActiveRequests().length,
      },
    },
    connections: {
      active: (process as any)._getActiveHandles().length || 0,
      max: 1000,
    },
  };

  res.status(200).json(metrics);
});

/**
 * @swagger
 * /health/dependencies:
 *   get:
 *     summary: Check dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Dependencies status
 */
router.get("/dependencies", async (req: Request, res: Response) => {
  const dependencies: Record<string, any> = {};

  // Check MongoDB
  try {
    const dbHealth = await healthCheckDB();
    dependencies.mongodb = {
      status: dbHealth.status,
      latency: dbHealth.latency,
      error: dbHealth.error,
    };
  } catch (error: any) {
    dependencies.mongodb = {
      status: "unhealthy",
      error: error.message,
    };
  }

  // Check Redis
  try {
    const redisReady = isRedisReady();
    dependencies.redis = {
      status: redisReady ? "healthy" : "unhealthy",
      ready: redisReady,
    };
  } catch (error: any) {
    dependencies.redis = {
      status: "unhealthy",
      error: error.message,
    };
  }

  // Check Email
  try {
    const emailConnected = emailService.isConnectedService();
    dependencies.email = {
      status: emailConnected ? "healthy" : "unhealthy",
      connected: emailConnected,
    };
  } catch (error: any) {
    dependencies.email = {
      status: "unhealthy",
      error: error.message,
    };
  }

  res.status(200).json({
    timestamp: new Date().toISOString(),
    dependencies,
  });
});

/**
 * @swagger
 * /health/version:
 *   get:
 *     summary: Get service version
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Version information
 */
router.get("/version", (req: Request, res: Response) => {
  res.status(200).json({
    version: packageJson.version || "1.0.0",
    name: packageJson.name || "todolist-api",
    description: packageJson.description || "TodoList API",
    node: process.version,
    environment: env.NODE_ENV,
    build: {
      date: process.env.BUILD_DATE || new Date().toISOString(),
      git: {
        commit: process.env.GIT_COMMIT || "unknown",
        branch: process.env.GIT_BRANCH || "unknown",
      },
    },
  });
});

export default router;
