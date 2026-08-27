export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    statusCode: number,
    message: string,
    isOperational: boolean = true,
    details?: any,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a 400 Bad Request error
   */
  static badRequest(message: string, details?: any): ApiError {
    return new ApiError(400, message, true, details);
  }

  /**
   * Create a 401 Unauthorized error
   */
  static unauthorized(
    message: string = "Unauthorized",
    details?: any,
  ): ApiError {
    return new ApiError(401, message, true, details);
  }

  /**
   * Create a 403 Forbidden error
   */
  static forbidden(message: string = "Forbidden", details?: any): ApiError {
    return new ApiError(403, message, true, details);
  }

  /**
   * Create a 404 Not Found error
   */
  static notFound(
    message: string = "Resource not found",
    details?: any,
  ): ApiError {
    return new ApiError(404, message, true, details);
  }

  /**
   * Create a 409 Conflict error
   */
  static conflict(message: string, details?: any): ApiError {
    return new ApiError(409, message, true, details);
  }

  /**
   * Create a 422 Validation error
   */
  static validation(
    message: string = "Validation failed",
    details?: any,
  ): ApiError {
    return new ApiError(422, message, true, details);
  }

  /**
   * Create a 429 Too Many Requests error
   */
  static tooManyRequests(
    message: string = "Too many requests",
    details?: any,
  ): ApiError {
    return new ApiError(429, message, true, details);
  }

  /**
   * Create a 500 Internal Server Error
   */
  static internal(
    message: string = "Internal server error",
    details?: any,
  ): ApiError {
    return new ApiError(500, message, false, details);
  }

  /**
   * Convert to JSON response
   */
  toJSON(): any {
    return {
      status: "error",
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details && { details: this.details }),
      ...(process.env.NODE_ENV === "development" && { stack: this.stack }),
    };
  }
}

export default ApiError;
