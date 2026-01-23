import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
  statusCode: number;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || message;
        code = (resp.code as string) || code;
        details = resp.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse: ErrorResponse = {
      error: {
        message,
        code,
        details,
      },
      statusCode: status,
      timestamp: new Date().toISOString(),
    };

    console.error('Error:', exception);

    response.status(status).json(errorResponse);
  }
}
