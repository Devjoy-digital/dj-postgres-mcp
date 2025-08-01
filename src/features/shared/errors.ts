export class ManagedError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ManagedError';
  }

  toResponse() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
}

export const ErrorCodes = {
  INVALID_CONNECTION_STRING: 'INVALID_CONNECTION_STRING',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  QUERY_ERROR: 'QUERY_ERROR',
  TIMEOUT: 'TIMEOUT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TABLE_NOT_FOUND: 'TABLE_NOT_FOUND',
  INVALID_PARAMS: 'INVALID_PARAMS',
  NO_CONNECTION: 'NO_CONNECTION'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];