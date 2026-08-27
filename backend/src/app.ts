import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import session from "express-session";
import RedisStore from "connect-redis";
import { v4 as uuidv4 } from "uuid";
import { env, isDevelopment, isProduction } from "./config/env";
import { redisClient } from "./config/redis";
import { logger, stream } from "./utils/logger";
import { errorHandler } from "./middleware/error.middleware";
import { requestLogger } from "./middleware/request.middleware";
import {
  authLimiter,
  apiLimiter,
  strictLimiter,
} from "./middleware/rateLimiter.middleware";
import { securityMiddleware } from "./middleware/security.middleware";
import { validationMiddleware } from "./middleware/validation.middleware";
import { authRoutes } from "./routes/auth.routes";
import { taskRoutes } from "./routes/task.routes";
import { userRoutes } from "./routes/user.routes";
import { healthRoutes } from "./routes/health.routes";
import { metricsRoutes } from "./routes/metrics.routes";
import { docsRoutes } from "./routes/docs.routes";
import { webhookRoutes } from "./routes/webhook.routes";
import { adminRoutes } from "./routes/admin.routes";
import { uploadRoutes } from "./routes/upload.routes";
import { notificationRoutes } from "./routes/notification.routes";
import { commentRoutes } from "./routes/comment.routes";
import { labelRoutes } from "./routes/label.routes";
import { attachmentRoutes } from "./routes/attachment.routes";
import { searchRoutes } from "./routes/search.routes";
import { reportRoutes } from "./routes/report.routes";
import { analyticsRoutes } from "./routes/analytics.routes";
import { cacheMiddleware } from "./middleware/cache.middleware";

export const app: Express = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", env.WS_CORS_ORIGIN],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hsts: {
      maxAge: env.HELMET_HSTS_MAX_AGE,
      includeSubDomains: env.HELMET_HSTS_INCLUDE_SUBDOMAINS,
      preload: env.HELMET_HSTS_PRELOAD,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(",");

      if (!origin || allowedOrigins.includes(origin) || isDevelopment) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: env.CORS_ALLOWED_METHODS.split(","),
    allowedHeaders: env.CORS_ALLOWED_HEADERS.split(","),
    exposedHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);

app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
    brotli: {
      enabled: true,
      quality: 11,
    },
  }),
);

if (env.FEATURE_REQUEST_LOGGING) {
  app.use(morgan("combined", { stream }));
  app.use(requestLogger);
}

app.use(
  express.json({
    limit: "10mb",
    verify: (req: any, res, buf, encoding) => {
      req.rawBody = buf.toString();
    },
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
    parameterLimit: 10000,
  }),
);

app.use(
  cookieParser(env.SESSION_SECRET, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE as any,
    maxAge: env.COOKIE_MAX_AGE,
    domain: env.COOKIE_DOMAIN,
    signed: true,
  }),
);

app.use(
  session({
    store: new RedisStore({
      client: redisClient,
      prefix: "session:",
      ttl: env.SESSION_MAX_AGE / 1000,
      disableTouch: false,
      serializer: {
        stringify: JSON.stringify,
        parse: JSON.parse,
      },
    }),
    secret: env.SESSION_SECRET,
    name: "todolist.sid",
    resave: env.SESSION_RESAVE,
    saveUninitialized: env.SESSION_SAVE_UNINITIALIZED,
    cookie: {
      secure: env.SESSION_SECURE,
      httpOnly: env.SESSION_HTTP_ONLY,
      sameSite: env.SESSION_SAME_SITE as any,
      maxAge: env.SESSION_MAX_AGE,
      domain: env.COOKIE_DOMAIN,
    },
    rolling: true,
    genid: () => uuidv4(),
  }),
);

app.use(securityMiddleware);

app.use((req: Request, res: Response, next: NextFunction) => {
  req.id = uuidv4();
  req.startTime = Date.now();

  const startTime = process.hrtime();
  res.on("finish", () => {
    const diff = process.hrtime(startTime);
    const responseTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    res.setHeader("X-Response-Time", `${responseTime}ms`);
  });

  next();
});

if (env.FEATURE_RATE_LIMITING) {
  app.use("/api/auth", authLimiter);
  app.use("/api", apiLimiter);
  app.use("/api/admin", strictLimiter);
}

app.use(validationMiddleware);

app.use("/health", healthRoutes);
app.use("/metrics", metricsRoutes);
app.use("/api-docs", docsRoutes);

app.use(`${env.API_PREFIX}/${env.API_VERSION}/auth`, authRoutes);
app.use(`${env.API_PREFIX}/${env.API_VERSION}/tasks`, taskRoutes);
app.use(`${env.API_PREFIX}/${env.API_VERSION}/users`, userRoutes);
app.use(`${env.API_PREFIX}/${env.API_VERSION}/webhooks`, webhookRoutes);
app.use(`${env.API_PREFIX}/${env.API_VERSION}/admin`, adminRoutes);
app.use(`${env.API_PREFIX}/${env.API_VERSION}/uploads`, uploadRoutes);
app.use(
  `${env.API_PREFIX}/${env.API_VERSION}/notifications`,
  notificationRoutes,
);
app.use(`${env.API_PREFIX}/${env.API_VERSION}/comments`, commentRoutes);
app.use(`${env.API_PREFIX}/${env.API_VERSION}/labels`, labelRoutes);
app.use(`${env.API_PREFIX}/${env.API_VERSION}/attachments`, attachmentRoutes);
app.use(`${env.API_PREFIX}/${env.API_VERSION}/search`, searchRoutes);
app.use(`${env.API_PREFIX}/${env.API_VERSION}/reports`, reportRoutes);
app.use(`${env.API_PREFIX}/${env.API_VERSION}/analytics`, analyticsRoutes);

app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "TodoList API",
    version: env.API_VERSION,
    environment: env.NODE_ENV,
    status: "operational",
    timestamp: new Date().toISOString(),
    documentation: `${req.protocol}://${req.get("host")}${env.API_PREFIX}/${env.API_VERSION}/docs`,
    health: `${req.protocol}://${req.get("host")}/health`,
    metrics: `${req.protocol}://${req.get("host")}/metrics`,
  });
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const error = new Error(
    `Route ${req.method} ${req.originalUrl} not found`,
  ) as any;
  error.status = 404;
  error.code = "ROUTE_NOT_FOUND";
  next(error);
});

app.use(errorHandler);

export default app;
