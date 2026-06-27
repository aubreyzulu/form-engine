import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import { AppException, ErrorCode } from './errors';

/**
 * Renders every failure as one consistent envelope:
 *
 *   { "error": { "code": string, "message": string, "details"?: [...] } }
 *
 * - AppException: uses its own code/message/details.
 * - Nest HttpException (e.g. ValidationPipe 400): mapped to a generic code with
 *   the underlying messages surfaced.
 * - Anything else: 500 INTERNAL (details logged, not leaked).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof AppException) {
      response.status(exception.getStatus()).json({
        error: {
          code: exception.code,
          message: exception.message,
          ...(exception.details ? { details: exception.details } : {}),
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : ((res as { message?: string | string[] }).message ?? exception.message);
      response.status(status).json({
        error: {
          // Honest, status-derived code (e.g. BAD_REQUEST from the ValidationPipe).
          code: HttpStatus[status] ?? ErrorCode.INTERNAL,
          message: Array.isArray(message) ? message.join('; ') : message,
        },
      });
      return;
    }

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : exception,
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: ErrorCode.INTERNAL, message: 'Internal server error' },
    });
  }
}
