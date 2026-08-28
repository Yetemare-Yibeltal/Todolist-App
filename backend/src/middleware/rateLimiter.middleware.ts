import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../config/redis";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/apiError";
import { performance } from "perf_hooks";

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  handler?: (req: Request, res: Response, next: NextFunction) => void;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  requestWasSuccessful?: (req: Request, res: Response) => boolean;
}

class RateLimiterService {
  private static instance: RateLimiterService;
  private store: RedisStore | null = null;
  private rateLimiters: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): RateLimiterService {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  private async initializeStore(): Promise<RedisStore> {
    if (!this.store) {
      this.store = new RedisStore({
        sendCommand: (...args: string[]) => {
          const client = redisClient();
          return client.sendCommand(args) as Promise<any>;
        },
        prefix: "rl:",
        resetExpiryOnChange: true,
      });
    }
    return this.store;
  }

  private getKeyGenerator(type: string): (req: Request) => string {
    return (req: Request): string => {
      const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
      const userId = (req as any).userId || "anonymous";
      const path = req.path;
      return `${type}:${userId}:${ip}:${path}`;
    };
  }

  private getSkipFunction(
    skipCondition?: (req: Request) => boolean,
  ): (req: Request) => boolean {
    return (req: Request): boolean => {
      if (skipCondition && skipCondition(req)) {
        return true;
      }

      const isHealthCheck = req.path === "/health" || req.path === "/metrics";
      if (isHealthCheck) {
        return true;
      }

      return false;
    };
  }

  private getHandler(
    statusCode: number = 429,
    message: string = "Too many requests, please try again later.",
  ): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      logger.warn("Rate limit exceeded:", {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userId: (req as any).userId,
      });

      throw new ApiError(statusCode, message);
    };
  }

  private async createRateLimiter(config: RateLimitConfig): Promise<any> {
    const store = await this.initializeStore();

    const defaultConfig: RateLimitConfig = {
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: "Too many requests, please try again later.",
      statusCode: 429,
      keyGenerator: this.getKeyGenerator("default"),
      skip: this.getSkipFunction(),
      handler: this.getHandler(),
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      requestWasSuccessful: (req: Request, res: Response) =>
        res.statusCode < 400,
    };

    const finalConfig = { ...defaultConfig, ...config };

    return rateLimit({
      store,
      windowMs: finalConfig.windowMs,
      max: finalConfig.max,
      message: finalConfig.message,
      statusCode: finalConfig.statusCode,
      keyGenerator: finalConfig.keyGenerator,
      skip: finalConfig.skip,
      handler: finalConfig.handler,
      skipSuccessfulRequests: finalConfig.skipSuccessfulRequests,
      skipFailedRequests: finalConfig.skipFailedRequests,
      requestWasSuccessful: finalConfig.requestWasSuccessful,
      standardHeaders: true,
      legacyHeaders: false,
      validate: {
        xForwardedForHeader: true,
        trustProxy: true,
      },
      onLimitReached: (req: Request, res: Response, options: any) => {
        logger.warn("Rate limit reached:", {
          ip: req.ip,
          path: req.path,
          method: req.method,
          userId: (req as any).userId,
          limit: options.max,
          window: options.windowMs,
        });
      },
    });
  }

  public async getRateLimiter(
    name: string,
    config: RateLimitConfig,
  ): Promise<any> {
    if (this.rateLimiters.has(name)) {
      return this.rateLimiters.get(name);
    }

    const limiter = await this.createRateLimiter(config);
    this.rateLimiters.set(name, limiter);
    return limiter;
  }

  public async clearRateLimiter(name: string): Promise<void> {
    if (this.rateLimiters.has(name)) {
      this.rateLimiters.delete(name);
    }
  }

  public async clearAllRateLimiters(): Promise<void> {
    this.rateLimiters.clear();
  }

  public async getRateLimitStatus(req: Request, name: string): Promise<any> {
    try {
      const key = `rl:${this.getKeyGenerator(name)(req)}`;
      const client = redisClient();
      const result = await client.sendCommand(["GET", key]);

      if (result) {
        const data = JSON.parse(result as string);
        return {
          current: data.current || 0,
          max: data.max || 0,
          window: data.window || 0,
          reset: data.reset || 0,
          remaining: Math.max(0, (data.max || 0) - (data.current || 0)),
        };
      }

      return null;
    } catch (error: any) {
      logger.error("Error getting rate limit status:", {
        error: error.message,
      });
      return null;
    }
  }

  public async resetRateLimit(req: Request, name: string): Promise<void> {
    try {
      const key = `rl:${this.getKeyGenerator(name)(req)}`;
      const client = redisClient();
      await client.sendCommand(["DEL", key]);
    } catch (error: any) {
      logger.error("Error resetting rate limit:", { error: error.message });
    }
  }
}

const rateLimiterService = RateLimiterService.getInstance();

export const createRateLimiter = async (
  config: RateLimitConfig,
): Promise<any> => {
  return rateLimiterService.getRateLimiter(
    `${config.windowMs}:${config.max}`,
    config,
  );
};

export const rateLimiter = {
  apiLimiter: async (req: Request, res: Response, next: NextFunction) => {
    const limiter = await rateLimiterService.getRateLimiter("api", {
      windowMs: env.RATE_LIMIT_API_WINDOW * 60 * 1000,
      max: env.RATE_LIMIT_API_MAX,
      keyGenerator: rateLimiterService["getKeyGenerator"]("api"),
      skip: rateLimiterService["getSkipFunction"](),
      handler: rateLimiterService["getHandler"](429, "API rate limit exceeded"),
    });
    return limiter(req, res, next);
  },

  authLimiter: async (req: Request, res: Response, next: NextFunction) => {
    const limiter = await rateLimiterService.getRateLimiter("auth", {
      windowMs: env.RATE_LIMIT_AUTH_WINDOW * 60 * 1000,
      max: env.RATE_LIMIT_AUTH_MAX,
      keyGenerator: rateLimiterService["getKeyGenerator"]("auth"),
      skip: rateLimiterService["getSkipFunction"](),
      handler: rateLimiterService["getHandler"](
        429,
        "Too many authentication attempts, please try again later.",
      ),
      skipSuccessfulRequests: true,
      requestWasSuccessful: (req: Request, res: Response) =>
        res.statusCode < 400,
    });
    return limiter(req, res, next);
  },

  strictLimiter: async (req: Request, res: Response, next: NextFunction) => {
    const limiter = await rateLimiterService.getRateLimiter("strict", {
      windowMs: env.RATE_LIMIT_STRICT_WINDOW * 60 * 1000,
      max: env.RATE_LIMIT_STRICT_MAX,
      keyGenerator: rateLimiterService["getKeyGenerator"]("strict"),
      skip: rateLimiterService["getSkipFunction"](),
      handler: rateLimiterService["getHandler"](
        429,
        "Strict rate limit exceeded",
      ),
    });
    return limiter(req, res, next);
  },

  passwordResetLimiter: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const limiter = await rateLimiterService.getRateLimiter("password-reset", {
      windowMs: 60 * 60 * 1000,
      max: 3,
      keyGenerator: (req: Request) => {
        const email = req.body.email || "";
        const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
        return `password-reset:${email}:${ip}`;
      },
      skip: rateLimiterService["getSkipFunction"](),
      handler: rateLimiterService["getHandler"](
        429,
        "Too many password reset attempts, please try again later.",
      ),
    });
    return limiter(req, res, next);
  },

  emailVerificationLimiter: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const limiter = await rateLimiterService.getRateLimiter(
      "email-verification",
      {
        windowMs: 60 * 60 * 1000,
        max: 5,
        keyGenerator: (req: Request) => {
          const email = req.body.email || "";
          const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
          return `email-verification:${email}:${ip}`;
        },
        skip: rateLimiterService["getSkipFunction"](),
        handler: rateLimiterService["getHandler"](
          429,
          "Too many email verification attempts, please try again later.",
        ),
      },
    );
    return limiter(req, res, next);
  },

  registrationLimiter: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const limiter = await rateLimiterService.getRateLimiter("registration", {
      windowMs: 24 * 60 * 60 * 1000,
      max: 10,
      keyGenerator: (req: Request) => {
        const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
        return `registration:${ip}`;
      },
      skip: rateLimiterService["getSkipFunction"](),
      handler: rateLimiterService["getHandler"](
        429,
        "Too many registration attempts, please try again later.",
      ),
    });
    return limiter(req, res, next);
  },

  taskCreationLimiter: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const limiter = await rateLimiterService.getRateLimiter("task-creation", {
      windowMs: 60 * 60 * 1000,
      max: 100,
      keyGenerator: (req: Request) => {
        const userId = (req as any).userId || "anonymous";
        const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
        return `task-creation:${userId}:${ip}`;
      },
      skip: rateLimiterService["getSkipFunction"](),
      handler: rateLimiterService["getHandler"](
        429,
        "Too many task creation attempts, please try again later.",
      ),
    });
    return limiter(req, res, next);
  },

  fileUploadLimiter: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const limiter = await rateLimiterService.getRateLimiter("file-upload", {
      windowMs: 60 * 60 * 1000,
      max: 50,
      keyGenerator: (req: Request) => {
        const userId = (req as any).userId || "anonymous";
        const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
        return `file-upload:${userId}:${ip}`;
      },
      skip: rateLimiterService["getSkipFunction"](),
      handler: rateLimiterService["getHandler"](
        429,
        "Too many file upload attempts, please try again later.",
      ),
    });
    return limiter(req, res, next);
  },

  searchLimiter: async (req: Request, res: Response, next: NextFunction) => {
    const limiter = await rateLimiterService.getRateLimiter("search", {
      windowMs: 60 * 1000,
      max: 30,
      keyGenerator: (req: Request) => {
        const userId = (req as any).userId || "anonymous";
        const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
        return `search:${userId}:${ip}`;
      },
      skip: rateLimiterService["getSkipFunction"](),
      handler: rateLimiterService["getHandler"](
        429,
        "Too many search requests, please try again later.",
      ),
    });
    return limiter(req, res, next);
  },
};

export const rateLimiterMiddleware = {
  api: rateLimiter.apiLimiter,
  auth: rateLimiter.authLimiter,
  strict: rateLimiter.strictLimiter,
  passwordReset: rateLimiter.passwordResetLimiter,
  emailVerification: rateLimiter.emailVerificationLimiter,
  registration: rateLimiter.registrationLimiter,
  taskCreation: rateLimiter.taskCreationLimiter,
  fileUpload: rateLimiter.fileUploadLimiter,
  search: rateLimiter.searchLimiter,
};

export default rateLimiterMiddleware;
