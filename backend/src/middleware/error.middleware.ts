import { Request, Response, NextFunction } from "express";
import { env, isDevelopment, isProduction } from "../config/env";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/apiError";
import { MongooseError } from "mongoose";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { ZodError } from "zod";
import { ValidationError } from "class-validator";
import { MulterError } from "multer";
import { performance } from "perf_hooks";

interface ErrorResponse {
  success: false;
  status: number;
  message: string;
  code?: string;
  errors?: any[];
  stack?: string;
  timestamp: string;
  path?: string;
  method?: string;
  requestId?: string;
  data?: any;
}

interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
  type?: string;
}

class ErrorMiddleware {
  private static instance: ErrorMiddleware;
  private errorMap = new Map<string, { status: number; code: string }>();

  private constructor() {
    this.initializeErrorMap();
  }

  public static getInstance(): ErrorMiddleware {
    if (!ErrorMiddleware.instance) {
      ErrorMiddleware.instance = new ErrorMiddleware();
    }
    return ErrorMiddleware.instance;
  }

  private initializeErrorMap(): void {
    this.errorMap.set("ValidationError", {
      status: 400,
      code: "VALIDATION_ERROR",
    });
    this.errorMap.set("MongoServerError", {
      status: 400,
      code: "DATABASE_ERROR",
    });
    this.errorMap.set("CastError", { status: 400, code: "INVALID_ID" });
    this.errorMap.set("DocumentNotFoundError", {
      status: 404,
      code: "NOT_FOUND",
    });
    this.errorMap.set("JsonWebTokenError", {
      status: 401,
      code: "INVALID_TOKEN",
    });
    this.errorMap.set("TokenExpiredError", {
      status: 401,
      code: "TOKEN_EXPIRED",
    });
    this.errorMap.set("ZodError", { status: 400, code: "VALIDATION_ERROR" });
    this.errorMap.set("MulterError", { status: 400, code: "UPLOAD_ERROR" });
    this.errorMap.set("RateLimitError", {
      status: 429,
      code: "RATE_LIMIT_EXCEEDED",
    });
    this.errorMap.set("TimeoutError", { status: 504, code: "TIMEOUT_ERROR" });
    this.errorMap.set("NetworkError", { status: 503, code: "NETWORK_ERROR" });
  }

  private formatZodErrors(error: ZodError): ValidationErrorDetail[] {
    return error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
      type: err.code,
    }));
  }

  private formatValidationErrors(
    errors: ValidationError[],
  ): ValidationErrorDetail[] {
    const formattedErrors: ValidationErrorDetail[] = [];

    for (const error of errors) {
      if (error.children && error.children.length > 0) {
        formattedErrors.push(...this.formatValidationErrors(error.children));
      } else {
        const constraints = error.constraints || {};
        for (const [key, message] of Object.entries(constraints)) {
          formattedErrors.push({
            field: error.property,
            message,
            value: error.value,
            type: key,
          });
        }
      }
    }

    return formattedErrors;
  }

  private formatMongoError(error: any): ValidationErrorDetail[] {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0] || "";
      const value = error.keyValue[field] || "";
      return [
        {
          field,
          message: `${field} "${value}" already exists`,
          value,
          type: "unique",
        },
      ];
    }

    if (error.name === "CastError") {
      return [
        {
          field: error.path || "",
          message: `Invalid ${error.path} format: ${error.value}`,
          value: error.value,
          type: "cast",
        },
      ];
    }

    if (error.name === "ValidationError") {
      const errors: ValidationErrorDetail[] = [];
      for (const [field, err] of Object.entries(error.errors)) {
        errors.push({
          field,
          message: (err as any).message || "Validation error",
          type: (err as any).kind || "validation",
        });
      }
      return errors;
    }

    return [
      {
        field: "database",
        message: error.message || "Database error",
        type: error.name || "database",
      },
    ];
  }

  private formatMulterError(error: MulterError): ValidationErrorDetail[] {
    const messages: Record<string, string> = {
      LIMIT_PART_COUNT: "Too many parts in the form",
      LIMIT_FILE_SIZE: "File is too large",
      LIMIT_FILE_COUNT: "Too many files",
      LIMIT_FIELD_KEY: "Field name is too long",
      LIMIT_FIELD_VALUE: "Field value is too long",
      LIMIT_FIELD_COUNT: "Too many fields",
      LIMIT_UNEXPECTED_FILE: "Unexpected file upload",
    };

    return [
      {
        field: error.field || "file",
        message: messages[error.code] || error.message || "Upload error",
        type: error.code,
      },
    ];
  }

  private shouldLogError(error: any): boolean {
    if (error instanceof ApiError && error.status < 500) {
      return false;
    }
    return true;
  }

  private getErrorDetails(error: any): {
    status: number;
    code: string;
    message: string;
  } {
    if (error instanceof ApiError) {
      return {
        status: error.status || 500,
        code: error.code || "API_ERROR",
        message: error.message || "An error occurred",
      };
    }

    if (error instanceof ZodError) {
      return {
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Validation failed",
      };
    }

    if (error instanceof ValidationError) {
      return {
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Validation failed",
      };
    }

    if (error instanceof JsonWebTokenError) {
      return {
        status: 401,
        code: "INVALID_TOKEN",
        message: "Invalid authentication token",
      };
    }

    if (error instanceof TokenExpiredError) {
      return {
        status: 401,
        code: "TOKEN_EXPIRED",
        message: "Authentication token has expired",
      };
    }

    if (error instanceof MulterError) {
      return {
        status: 400,
        code: "UPLOAD_ERROR",
        message: error.message || "File upload error",
      };
    }

    if (error instanceof MongooseError) {
      const errorInfo = this.errorMap.get(error.name);
      return {
        status: errorInfo?.status || 500,
        code: errorInfo?.code || "DATABASE_ERROR",
        message: error.message || "Database error occurred",
      };
    }

    if (error.code === 11000) {
      return {
        status: 400,
        code: "DUPLICATE_ERROR",
        message: "Duplicate entry found",
      };
    }

    if (error.code === "ECONNREFUSED") {
      return {
        status: 503,
        code: "SERVICE_UNAVAILABLE",
        message: "Service is temporarily unavailable",
      };
    }

    return {
      status: error.status || 500,
      code: error.code || "INTERNAL_ERROR",
      message: isProduction
        ? "Internal server error"
        : error.message || "An unexpected error occurred",
    };
  }

  private formatErrorResponse(
    error: any,
    req: Request,
    status: number,
    code: string,
    message: string,
  ): ErrorResponse {
    const response: ErrorResponse = {
      success: false,
      status,
      message,
      code,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId: req.id,
    };

    if (error instanceof ZodError) {
      response.errors = this.formatZodErrors(error);
    } else if (error instanceof ValidationError) {
      response.errors = this.formatValidationErrors(error);
    } else if (error.name === "ValidationError" || error.code === 11000) {
      response.errors = this.formatMongoError(error);
    } else if (error instanceof MulterError) {
      response.errors = this.formatMulterError(error);
    } else if (error instanceof ApiError && error.errors) {
      response.errors = error.errors;
    }

    if (isDevelopment || (!isProduction && req.query.debug === "true")) {
      response.stack = error.stack;
      response.data = error.data;
    }

    return response;
  }

  private logError(error: any, req: Request, status: number): void {
    const errorData = {
      status,
      message: error.message,
      path: req.path,
      method: req.method,
      userId: (req as any).userId,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      stack: error.stack,
      requestId: req.id,
      error: error,
    };

    if (status >= 500) {
      logger.error("Server error:", errorData);
    } else if (status >= 400) {
      logger.warn("Client error:", errorData);
    } else {
      logger.info("Error:", errorData);
    }
  }

  private async trackErrorMetrics(error: any, status: number): Promise<void> {
    try {
      const metrics = {
        type: error.name || "UnknownError",
        status,
        message: error.message,
        timestamp: Date.now(),
      };

      await Promise.race([
        new Promise((resolve) => setTimeout(resolve, 1000)),
        Promise.resolve(),
      ]);
    } catch (err) {
      // Silently fail metrics tracking
    }
  }

  public handle() {
    return async (
      error: any,
      req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      const startTime = performance.now();

      try {
        if (error instanceof ApiError && error.status === 404) {
          const response: ErrorResponse = {
            success: false,
            status: 404,
            message: error.message || "Resource not found",
            code: "NOT_FOUND",
            timestamp: new Date().toISOString(),
            path: req.path,
            method: req.method,
            requestId: req.id,
          };

          if (isDevelopment) {
            response.stack = error.stack;
          }

          return res.status(404).json(response);
        }

        const details = this.getErrorDetails(error);
        const { status, code, message } = details;

        if (this.shouldLogError(error)) {
          this.logError(error, req, status);
        }

        await this.trackErrorMetrics(error, status);

        const formattedError = this.formatErrorResponse(
          error,
          req,
          status,
          code,
          message,
        );

        const duration = (performance.now() - startTime) / 1000;
        if (duration > 1) {
          logger.warn(`Slow error response: ${duration.toFixed(2)}s`, {
            status,
            path: req.path,
            method: req.method,
          });
        }

        res.status(status).json(formattedError);
      } catch (err) {
        logger.error("Error in error middleware:", {
          error: err,
          originalError: error,
        });
        res.status(500).json({
          success: false,
          status: 500,
          message: "Internal server error",
          timestamp: new Date().toISOString(),
          requestId: req.id,
        });
      }
    };
  }

  public notFound() {
    return (req: Request, res: Response, next: NextFunction) => {
      const error = new ApiError(
        404,
        `Route ${req.method} ${req.originalUrl} not found`,
      );
      error.code = "NOT_FOUND";
      next(error);
    };
  }

  public async handleAsync(fn: Function) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  }

  public errorLogger() {
    return (error: any, req: Request, res: Response, next: NextFunction) => {
      if (error instanceof ApiError && error.status < 500) {
        logger.warn("API Error:", {
          status: error.status,
          message: error.message,
          code: error.code,
          path: req.path,
          method: req.method,
          userId: (req as any).userId,
        });
      } else {
        logger.error("Unhandled Error:", {
          error: error.message,
          stack: error.stack,
          path: req.path,
          method: req.method,
          userId: (req as any).userId,
        });
      }
      next(error);
    };
  }
}

export const errorMiddleware = ErrorMiddleware.getInstance();
export default errorMiddleware;
