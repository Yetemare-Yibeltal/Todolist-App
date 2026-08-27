import winston from "winston";
import { config } from "../config/env";
import path from "path";
import fs from "fs";

const LOG_DIR = path.join(process.cwd(), "logs");

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaString = Object.keys(meta).length
      ? ` ${JSON.stringify(meta)}`
      : "";
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaString}${stack ? `\n${stack}` : ""}`;
  }),
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString =
      Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level}: ${message}${metaString}`;
  }),
);

// Create logger instance
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  defaultMeta: { service: "todolist-api" },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.isProduction ? logFormat : consoleFormat,
    }),
    // File transports
    new winston.transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, "combined.log"),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, "exceptions.log"),
      format: logFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, "rejections.log"),
      format: logFormat,
    }),
  ],
});

// Create a stream for morgan integration
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Utility function to create child loggers
export const createLogger = (module: string) => {
  return logger.child({ module });
};

// Log uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  if (config.isProduction) {
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason);
  if (config.isProduction) {
    process.exit(1);
  }
});

export default logger;
