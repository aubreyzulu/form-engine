import { HttpException, HttpStatus } from '@nestjs/common';

import type { ValidationError } from '@formbuilder/shared';

/** Stable, machine-readable error codes surfaced in the API error envelope. */
export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  SUBMISSION_VALIDATION_FAILED: 'SUBMISSION_VALIDATION_FAILED',
  SCHEMA_INVALID: 'SCHEMA_INVALID',
  UI_SCHEMA_INVALID: 'UI_SCHEMA_INVALID',
  UNSUPPORTED_FIELD_TYPE: 'UNSUPPORTED_FIELD_TYPE',
  FORM_NOT_FOUND: 'FORM_NOT_FOUND',
  VERSION_NOT_FOUND: 'VERSION_NOT_FOUND',
  SUBMISSION_NOT_FOUND: 'SUBMISSION_NOT_FOUND',
  NO_PUBLISHED_VERSION: 'NO_PUBLISHED_VERSION',
  VERSION_NOT_EDITABLE: 'VERSION_NOT_EDITABLE',
  FORM_KEY_TAKEN: 'FORM_KEY_TAKEN',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

interface AppExceptionBody {
  code: ErrorCodeValue;
  message: string;
  details?: ValidationError[];
}

/** Base for all domain errors. Carries a stable `code` and optional structured
 *  `details` (used for validation failures). The global filter renders these. */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly code: ErrorCodeValue,
    message: string,
    public readonly details?: ValidationError[],
  ) {
    const body: AppExceptionBody = { code, message, details };
    super(body, status);
  }
}

export class NotFoundError extends AppException {
  constructor(code: ErrorCodeValue, message: string) {
    super(HttpStatus.NOT_FOUND, code, message);
  }
}

export class ConflictError extends AppException {
  constructor(code: ErrorCodeValue, message: string) {
    super(HttpStatus.CONFLICT, code, message);
  }
}

/** Submission/schema content that failed JSON Schema validation (HTTP 422). */
export class UnprocessableError extends AppException {
  constructor(code: ErrorCodeValue, message: string, details: ValidationError[]) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, code, message, details);
  }
}
