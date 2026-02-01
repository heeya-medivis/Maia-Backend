import { HttpException, HttpStatus } from "@nestjs/common";

export class AppException extends HttpException {
  constructor(
    message: string,
    code: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    super({ message, code, details }, statusCode);
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = "Unauthorized", code = "UNAUTHORIZED") {
    super(message, code, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenException extends AppException {
  constructor(message = "Forbidden", code = "FORBIDDEN") {
    super(message, code, HttpStatus.FORBIDDEN);
  }
}

export class NotFoundException extends AppException {
  constructor(message = "Not found", code = "NOT_FOUND") {
    super(message, code, HttpStatus.NOT_FOUND);
  }
}

export class BadRequestException extends AppException {
  constructor(
    message = "Bad request",
    code = "BAD_REQUEST",
    details?: unknown,
  ) {
    super(message, code, HttpStatus.BAD_REQUEST, details);
  }
}

export class ConflictException extends AppException {
  constructor(message = "Conflict", code = "CONFLICT") {
    super(message, code, HttpStatus.CONFLICT);
  }
}

export class InsufficientCreditsException extends AppException {
  constructor(
    message = "Insufficient credits",
    required?: number,
    available?: number,
  ) {
    super(message, "INSUFFICIENT_CREDITS", HttpStatus.PAYMENT_REQUIRED, {
      required,
      available,
    });
  }
}
