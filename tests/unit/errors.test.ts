import { ManagedError, ErrorCodes } from '../../src/features/shared/errors.js';

describe('ManagedError', () => {
  it('should create error with code and message', () => {
    const error = new ManagedError(
      ErrorCodes.CONNECTION_FAILED,
      'Failed to connect to database'
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ManagedError');
    expect(error.code).toBe('CONNECTION_FAILED');
    expect(error.message).toBe('Failed to connect to database');
    expect(error.details).toBeUndefined();
  });

  it('should create error with details', () => {
    const details = { host: 'localhost', port: 5432 };
    const error = new ManagedError(
      ErrorCodes.CONNECTION_FAILED,
      'Failed to connect to database',
      details
    );

    expect(error.details).toEqual(details);
  });

  it('should convert to response format', () => {
    const error = new ManagedError(
      ErrorCodes.INVALID_PARAMS,
      'Invalid parameters provided',
      { param: 'query' }
    );

    const response = error.toResponse();

    expect(response).toEqual({
      error: {
        code: 'INVALID_PARAMS',
        message: 'Invalid parameters provided',
        details: { param: 'query' }
      }
    });
  });
});

describe('ErrorCodes', () => {
  it('should have all required error codes', () => {
    const expectedCodes = [
      'INVALID_CONNECTION_STRING',
      'CONNECTION_FAILED',
      'AUTHENTICATION_FAILED',
      'QUERY_ERROR',
      'TIMEOUT',
      'PERMISSION_DENIED',
      'TABLE_NOT_FOUND',
      'INVALID_PARAMS',
      'NO_CONNECTION'
    ];

    expectedCodes.forEach(code => {
      expect(ErrorCodes).toHaveProperty(code);
      expect(ErrorCodes[code as keyof typeof ErrorCodes]).toBe(code);
    });
  });

  it('should not have removed error codes', () => {
    // Verify SESSION_NOT_FOUND was removed
    expect(ErrorCodes).not.toHaveProperty('SESSION_NOT_FOUND');
  });
});
