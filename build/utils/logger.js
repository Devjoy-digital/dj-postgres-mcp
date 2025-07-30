/**
 * Simple logging utility with timestamps for debugging
 */
export function log(message, data) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [PostgreSQL MCP] ${message}`;
    if (data !== undefined) {
        console.error(logMessage, JSON.stringify(data, null, 2));
    }
    else {
        console.error(logMessage);
    }
}
export function logError(message, error) {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error(`[${timestamp}] [PostgreSQL MCP] ERROR: ${message}`);
    console.error(`[${timestamp}] [PostgreSQL MCP] Error details: ${errorMessage}`);
    if (stack) {
        console.error(`[${timestamp}] [PostgreSQL MCP] Stack trace: ${stack}`);
    }
}
