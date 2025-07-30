/**
 * Config.ts - Configuration management for the PostgreSQL MCP server
 * 
 * This file defines the configuration structure and default values.
 * The configuration is stored locally and persists between server restarts.
 */

/**
 * Main configuration interface for the PostgreSQL MCP server
 * This defines all the settings that can be configured by the user
 */
export interface PostgresConfig {
  /** Database host (e.g., localhost, Azure hostname, AWS RDS endpoint) */
  host: string;
  
  /** Database port */
  port: number;
  
  /** Database name */
  database: string;
  
  /** Database username */
  user: string;
  
  /** Database password (stored securely) */
  password: string;
  
  /** SSL configuration - true enables SSL with rejectUnauthorized: false */
  ssl: boolean;
  
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  
  /** Query timeout in milliseconds */
  queryTimeout: number;
  
  /** Maximum number of concurrent connections */
  maxConnections: number;
  
  /** Whether to automatically retry failed connections */
  autoRetry: boolean;
}

/**
 * Default configuration values
 * These are used when the server starts for the first time
 */
export const DEFAULT_CONFIG: PostgresConfig = {
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

/**
 * Configuration file metadata
 * This helps track when the config was created and modified
 */
export interface ConfigMetadata {
  /** When the configuration was first created */
  created: string;
  
  /** When the configuration was last modified */
  lastModified: string;
  
  /** Version of the config format (for future migrations) */
  version: string;
  
  /** Environment where this config was created */
  environment?: string;
  
  /** Description of the database connection */
  description?: string;
}

/**
 * Complete configuration file structure
 * This is what gets saved to disk as JSON
 */
export interface ConfigFile {
  /** The actual configuration settings */
  config: PostgresConfig;
  
  /** Metadata about the configuration file */
  metadata: ConfigMetadata;
}

/**
 * Parameters for updating configuration
 * Only the fields that are provided will be updated
 */
export interface UpdateConfigParams {
  /** New database host */
  host?: string;
  
  /** New database port */
  port?: number;
  
  /** New database name */
  database?: string;
  
  /** New database username */
  user?: string;
  
  /** New database password */
  password?: string;
  
  /** New SSL setting */
  ssl?: boolean;
  
  /** New connection timeout */
  connectionTimeout?: number;
  
  /** New query timeout */
  queryTimeout?: number;
  
  /** New max connections setting */
  maxConnections?: number;
  
  /** New auto retry setting */
  autoRetry?: boolean;
  
  /** New description */
  description?: string;
}

/**
 * Connection test result interface
 */
export interface ConnectionTestResult {
  /** Whether the connection was successful */
  success: boolean;
  
  /** Server version if connection successful */
  version?: string;
  
  /** Server time if connection successful */
  serverTime?: string;
  
  /** Error message if connection failed */
  error?: string;
  
  /** Connection latency in milliseconds */
  latency?: number;
}