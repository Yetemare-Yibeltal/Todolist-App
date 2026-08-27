import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { env } from "../config/env";
import { format } from "util";

const {
  combine,
  timestamp,
  printf,
  colorize,
  json,
  errors,
  splat,
  label: labelFn,
} = winston.format;

const customFormat = printf(
  ({ level, message, timestamp, label, ...metadata }) => {
    let msg = `${timestamp} [${label}] ${level}: ${message}`;

    if (Object.keys(metadata).length > 0) {
      const metaString = Object.keys(metadata)
        .filter(
          (key) => key !== "label" && key !== "timestamp" && key !== "level",
        )
        .reduce((acc, key) => {
          const value = metadata[key];
          if (value instanceof Error) {
            return acc + ` ${key}=${value.message}\n${value.stack}`;
          } else if (typeof value === "object") {
            return acc + ` ${key}=${JSON.stringify(value)}`;
          } else {
            return acc + ` ${key}=${value}`;
          }
        }, "");
      msg += metaString;
    }

    return msg;
  },
);

const jsonFormat = combine(
  errors({ stack: true }),
  splat(),
  timestamp(),
  json(),
);

const consoleFormat = combine(
  colorize(),
  labelFn({ label: "TodoListAPI" }),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  customFormat,
);

const transports: winston.transport[] = [];

if (env.NODE_ENV !== "production") {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: combine(jsonFormat, colorize()),
      handleExceptions: true,
      handleRejections: true,
    }),
  );
}

const createDailyRotateTransport = (filename: string, level: string) => {
  return new DailyRotateFile({
    filename: `${env.LOG_FILE_PATH}/%DATE%-${filename}`,
    datePattern: "YYYY-MM-DD",
    zippedArchive: env.LOG_COMPRESS,
    maxSize: env.LOG_MAX_SIZE,
    maxFiles: env.LOG_MAX_FILES,
    level,
    format: jsonFormat,
    handleExceptions: true,
    handleRejections: true,
  });
};

if (env.NODE_ENV !== "test") {
  transports.push(
    createDailyRotateTransport("error.log", "error"),
    createDailyRotateTransport("combined.log", "info"),
    createDailyRotateTransport("debug.log", "debug"),
    createDailyRotateTransport("audit.log", "info"),
    createDailyRotateTransport("performance.log", "info"),
  );
}

const logger = winston.createLogger({
  level: env.LOG_LEVEL || "info",
  format: jsonFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: `${env.LOG_FILE_PATH}/exceptions.log`,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: `${env.LOG_FILE_PATH}/rejections.log`,
    }),
  ],
  exitOnError: false,
  silent: env.NODE_ENV === "test",
});

const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

const logWithContext = (level: string, message: string, context?: any) => {
  const entry: any = {
    message,
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    service: "todolist-api",
  };

  if (context) {
    if (context instanceof Error) {
      entry.error = {
        message: context.message,
        stack: context.stack,
        name: context.name,
      };
    } else if (typeof context === "object") {
      entry.context = context;
    } else {
      entry.context = { value: context };
    }
  }

  logger.log(level, entry);
};

const createLogger = (module: string) => {
  const childLogger = logger.child({ module });

  return {
    error: (message: string, context?: any) => {
      childLogger.error(message, context);
    },
    warn: (message: string, context?: any) => {
      childLogger.warn(message, context);
    },
    info: (message: string, context?: any) => {
      childLogger.info(message, context);
    },
    debug: (message: string, context?: any) => {
      childLogger.debug(message, context);
    },
    trace: (message: string, context?: any) => {
      childLogger.trace(message, context);
    },
    fatal: (message: string, context?: any) => {
      childLogger.fatal(message, context);
    },
    child: (moduleName: string) => createLogger(moduleName),
  };
};

const performanceLogger = {
  start: (operation: string) => {
    const startTime = process.hrtime();
    return {
      end: () => {
        const diff = process.hrtime(startTime);
        const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
        logger.info(`Performance: ${operation} took ${durationMs}ms`, {
          operation,
          duration: parseFloat(durationMs),
          timestamp: new Date().toISOString(),
        });
        return parseFloat(durationMs);
      },
    };
  },
};

const auditLogger = {
  log: (
    action: string,
    userId: string,
    data: any,
    ip?: string,
    userAgent?: string,
  ) => {
    logger.info("Audit log", {
      action,
      userId,
      data,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      audit: true,
    });
  },
  login: (
    userId: string,
    success: boolean,
    ip?: string,
    userAgent?: string,
  ) => {
    logger.info("Audit: Login attempt", {
      action: "login",
      userId,
      success,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      audit: true,
    });
  },
  logout: (userId: string, ip?: string) => {
    logger.info("Audit: Logout", {
      action: "logout",
      userId,
      ip,
      timestamp: new Date().toISOString(),
      audit: true,
    });
  },
  register: (userId: string, email: string, ip?: string) => {
    logger.info("Audit: User registration", {
      action: "register",
      userId,
      email,
      ip,
      timestamp: new Date().toISOString(),
      audit: true,
    });
  },
  passwordReset: (userId: string, success: boolean, ip?: string) => {
    logger.info("Audit: Password reset", {
      action: "passwordReset",
      userId,
      success,
      ip,
      timestamp: new Date().toISOString(),
      audit: true,
    });
  },
  dataAccess: (
    userId: string,
    resource: string,
    action: string,
    data: any,
    ip?: string,
  ) => {
    logger.info("Audit: Data access", {
      action: "dataAccess",
      userId,
      resource,
      operation: action,
      data,
      ip,
      timestamp: new Date().toISOString(),
      audit: true,
    });
  },
  security: (
    userId: string,
    event: string,
    severity: string,
    details: any,
    ip?: string,
  ) => {
    logger.warn("Audit: Security event", {
      action: "securityEvent",
      userId,
      event,
      severity,
      details,
      ip,
      timestamp: new Date().toISOString(),
      audit: true,
    });
  },
};

const requestLogger = {
  log: (req: any, res: any, responseTime: number) => {
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      responseTime,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      userId: req.user?.id,
      correlationId: req.id,
      query: req.query,
      params: req.params,
    };

    if (res.statusCode >= 400) {
      logger.warn("Request failed", logData);
    } else {
      logger.info("Request completed", logData);
    }
  },
};

export {
  logger,
  stream,
  logWithContext,
  createLogger,
  performanceLogger,
  auditLogger,
  requestLogger,
  DailyRotateFile,
};

export default logger;
