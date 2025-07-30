/**
 * Config.ts - Configuration management for the PostgreSQL MCP server
 *
 * This file defines the configuration structure and default values.
 * The configuration is stored locally and persists between server restarts.
 */
/**
 * Default configuration values
 * These are used when the server starts for the first time
 */
export const DEFAULT_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '', // Will be set by user
    ssl: true, // Default to SSL for security
    connectionTimeout: 30000, // 30 seconds
    queryTimeout: 60000, // 60 seconds
    maxConnections: 10,
    autoRetry: true
};
