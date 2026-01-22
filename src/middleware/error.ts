import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { env } from "../config/env.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code = "UNAUTHORIZED") {
    super(401, message, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", code = "FORBIDDEN") {
    super(403, message, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", code = "NOT_FOUND") {
    super(404, message, code);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", code = "BAD_REQUEST", details?: unknown) {
    super(400, message, code, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", code = "CONFLICT") {
    super(409, message, code);
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(message = "Insufficient credits", required?: number, available?: number) {
    super(402, message, "INSUFFICIENT_CREDITS", { required, available });
  }
}

interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export function errorHandler(err: Error, c: Context): Response {
  console.error("Error:", err);

  let statusCode = 500;
  let response: ErrorResponse = {
    error: {
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    },
  };

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    response = {
      error: {
        message: err.message,
        code: err.code,
        details: err.details,
      },
    };
  } else if (err instanceof HTTPException) {
    statusCode = err.status;
    response = {
      error: {
        message: err.message,
        code: "HTTP_ERROR",
      },
    };
  } else if (err instanceof ZodError) {
    statusCode = 400;
    response = {
      error: {
        message: "Validation error",
        code: "VALIDATION_ERROR",
        details: err.errors,
      },
    };
  }

  // Include stack trace in development
  if (env.NODE_ENV === "development" && !(err instanceof AppError)) {
    response.error.details = {
      ...(response.error.details as object || {}),
      stack: err.stack,
    };
  }

  return c.json(response, statusCode as 400 | 401 | 402 | 403 | 404 | 409 | 500);
}
