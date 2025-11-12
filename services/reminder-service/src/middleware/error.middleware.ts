/**
 * RFC 7807 Problem Details Error Handler
 * Returns application/problem+json for all errors
 */

import { Request, Response, NextFunction } from "express";
import { eventLogger, EventType } from "../utils/logger";

/**
 * Base Application Error following RFC 7807
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly type: string;
  public readonly title: string;
  public readonly detail: string;
  public readonly instance: string;
  public readonly errors?: any[];
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    title: string,
    detail: string,
    instance: string,
    type?: string,
    errors?: any[],
  ) {
    super(detail);
    this.statusCode = statusCode;
    this.type = type || this.getDefaultType(statusCode);
    this.title = title;
    this.detail = detail;
    this.instance = instance;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  private getDefaultType(statusCode: number): string {
    const baseUrl = process.env.API_BASE_URL || "https://api.example.com";
    const types: Record<number, string> = {
      400: `${baseUrl}/problems/validation-error`,
      401: `${baseUrl}/problems/unauthorized`,
      403: `${baseUrl}/problems/forbidden`,
      404: `${baseUrl}/problems/not-found`,
      409: `${baseUrl}/problems/conflict`,
      500: `${baseUrl}/problems/internal-error`,
    };
    return types[statusCode] || `${baseUrl}/problems/error`;
  }

  toJSON(traceId?: string) {
    const problem: any = {
      type: this.type,
      title: this.title,
      status: this.statusCode,
      detail: this.detail,
      instance: this.instance,
    };

    if (this.errors && this.errors.length > 0) {
      problem.errors = this.errors;
    }

    if (traceId) {
      problem.traceId = traceId;
    }

    return problem;
  }
}

/**
 * Specific error types
 */
export class ValidationError extends AppError {
  constructor(detail: string, instance: string, errors?: any[]) {
    super(400, "Validation Error", detail, instance, undefined, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(detail: string, instance: string) {
    super(401, "Unauthorized", detail, instance);
  }
}

export class ForbiddenError extends AppError {
  constructor(detail: string, instance: string) {
    super(403, "Forbidden", detail, instance);
  }
}

export class NotFoundError extends AppError {
  constructor(detail: string, instance: string) {
    super(404, "Not Found", detail, instance);
  }
}

export class ConflictError extends AppError {
  constructor(detail: string, instance: string, type?: string) {
    super(
      409,
      type === "idempotency" ? "Idempotency Conflict" : "Conflict",
      detail,
      instance,
      type
        ? `${process.env.API_BASE_URL || "https://api.example.com"}/problems/${type}-conflict`
        : undefined,
    );
  }
}

export class InternalServerError extends AppError {
  constructor(detail: string, instance: string) {
    super(500, "Internal Server Error", detail, instance);
  }
}

/**
 * Central error handler middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Generate trace ID from request or create new one
  const traceId =
    (req.headers["x-trace-id"] as string) ||
    (req as any).traceId ||
    generateTraceId();

  // Log error with context
  eventLogger.log(EventType.ERROR_OCCURRED, {
    error: err.message,
    stack: err.stack,
    traceId,
    path: req.path,
    method: req.method,
  });

  // Handle known application errors
  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .type("application/problem+json")
      .json(err.toJSON(traceId));
  }

  // Handle validation errors from express-validator or similar
  if (err.name === "ValidationError") {
    const validationError = new ValidationError(
      "Request validation failed",
      req.path,
      (err as any).errors || [],
    );
    return res
      .status(400)
      .type("application/problem+json")
      .json(validationError.toJSON(traceId));
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    const authError = new UnauthorizedError(
      err.message || "Authentication token is invalid",
      req.path,
    );
    return res
      .status(401)
      .type("application/problem+json")
      .json(authError.toJSON(traceId));
  }

  // Handle database errors
  if (err.name === "QueryFailedError" || (err as any).code?.startsWith("23")) {
    console.error("Database error:", err);
    const dbError = new InternalServerError(
      "A database error occurred",
      req.path,
    );
    return res
      .status(500)
      .type("application/problem+json")
      .json(dbError.toJSON(traceId));
  }

  // Handle unknown errors
  console.error("💥 Unhandled Error:", err);

  const unknownError = new InternalServerError(
    process.env.NODE_ENV === "production"
      ? "An unexpected error occurred while processing your request"
      : err.message,
    req.path,
  );

  return res
    .status(500)
    .type("application/problem+json")
    .json({
      ...unknownError.toJSON(traceId),
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
};

/**
 * 404 handler for unknown routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const error = new NotFoundError(
    `Route ${req.method} ${req.path} not found`,
    req.path,
  );

  const traceId = (req.headers["x-trace-id"] as string) || generateTraceId();

  res.status(404).type("application/problem+json").json(error.toJSON(traceId));
};

/**
 * Async error wrapper
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Generate trace ID for distributed tracing
 */
function generateTraceId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
