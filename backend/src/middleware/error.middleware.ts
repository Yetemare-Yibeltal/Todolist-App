import { Request, Response, NextFunction } from "express";
import { env, isDevelopment, isProduction } from "../config/env";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/apiError";
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
}
class ErrorMiddleware {
  private static instance: ErrorMiddleware;
  private constructor() {}
  public static getInstance(): ErrorMiddleware {
    if (!ErrorMiddleware.instance) {
      ErrorMiddleware.instance = new ErrorMiddleware();
    }
    return ErrorMiddleware.instance;
  }
  private getErrorDetails(error: any): {
    status: number;
    code: string;
    message: string;
  } {
    if (error instanceof ApiError) {
      return {
        status: error.statusCode || 500,
        code: "API_ERROR",
        message: error.message || "An error occurred",
      };
    }
    if (error.name === "ValidationError") {
      return {
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Validation failed",
      };
    }
    if (error.name === "JsonWebTokenError") {
      return {
        status: 401,
        code: "INVALID_TOKEN",
        message: "Invalid authentication token",
      };
    }
    if (error.name === "TokenExpiredError") {
      return {
        status: 401,
        code: "TOKEN_EXPIRED",
        message: "Authentication token has expired",
      };
    }
    if (error.code === 11000) {
      return {
        status: 400,
        code: "DUPLICATE_ERROR",
        message: "Duplicate entry found",
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
    };
    if (error.errors) {
      response.errors = error.errors;
    }
    if (isDevelopment || (!isProduction && req.query?.debug === "true")) {
      response.stack = error.stack;
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
    };
    if (status >= 500) {
      logger.error("Server error:", errorData);
    } else if (status >= 400) {
      logger.warn("Client error:", errorData);
    }
  }
  public handle() {
    return (error: any, req: Request, res: Response, next: NextFunction) => {
      try {
        const details = this.getErrorDetails(error);
        const { status, code, message } = details;
        this.logError(error, req, status);
        const formattedError = this.formatErrorResponse(
          error,
          req,
          status,
          code,
          message,
        );
        res.status(status).json(formattedError);
      } catch (err) {
        logger.error("Error in error middleware:", {
          error: err,
          originalError: error,
        });
        res
          .status(500)
          .json({
            success: false,
            status: 500,
            message: "Internal server error",
            timestamp: new Date().toISOString(),
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
      next(error);
    };
  }
}
export const errorMiddleware = ErrorMiddleware.getInstance();
export default errorMiddleware;
