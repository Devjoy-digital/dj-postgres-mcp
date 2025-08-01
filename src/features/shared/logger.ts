const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';

function sanitizeConnectionString(connStr: string): string {
  // Simple sanitization - hide password in connection strings
  return connStr.replace(/:[^@]+@/, ':****@');
}

export function log(message: string, data?: Record<string, unknown>): void {
  if (!DEBUG) return;
  
  const timestamp = new Date().toISOString();
  const logData = sanitizeLogData(data);
  
  if (logData && Object.keys(logData).length > 0) {
    console.error(`[${timestamp}] ${message}`, JSON.stringify(logData));
  } else {
    console.error(`[${timestamp}] ${message}`);
  }
}

export function logError(message: string, error: unknown, data?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const logData = sanitizeLogData(data);
  
  console.error(`[${timestamp}] ERROR: ${message}`, errorMessage);
  
  if (logData && Object.keys(logData).length > 0) {
    console.error('Context:', JSON.stringify(logData));
  }
  
  if (DEBUG && error instanceof Error && error.stack) {
    console.error('Stack:', error.stack);
  }
}

function sanitizeLogData(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data) return undefined;
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Never log sensitive keys
    if (isSensitiveKey(key)) {
      sanitized[key] = '****';
    } else if (typeof value === 'string' && looksLikeConnectionString(value)) {
      sanitized[key] = sanitizeConnectionString(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

function isSensitiveKey(key: string): boolean {
  const sensitivePatterns = [
    'password',
    'secret',
    'token',
    'key',
    'auth',
    'credential',
    'private',
    'connectionString',
    'connection_string'
  ];
  
  const lowerKey = key.toLowerCase();
  return sensitivePatterns.some(pattern => lowerKey.includes(pattern));
}

function looksLikeConnectionString(value: string): boolean {
  return value.startsWith('postgresql://') || value.startsWith('postgres://');
}