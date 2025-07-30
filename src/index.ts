#!/usr/bin/env node

/**
 * PostgreSQL MCP Server
 * Provides tools and resources for interacting with PostgreSQL databases.
 * Perfect for testing database schema changes and running SQL queries.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";

// Environment variables are loaded by the system - no need for dotenv in MCP servers
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "pg";
import { McpConfigHandler } from './handlers/McpConfigHandler.js';
import { PostgresConfig } from './models/Config.js';
import { log, logError } from './utils/logger.js';


// Configuration handler will be initialized in main function
let configHandler: McpConfigHandler;

// Server instance will be created in main function after config is loaded
let server: Server;

/**
 * Create a PostgreSQL client connection
 */
async function createClient(): Promise<Client> {
  log('createClient: Starting database client creation');
  
  // Ensure config handler is initialized
  if (!configHandler) {
    log('createClient: Config handler not initialized');
    throw new Error('Server not fully initialized. Please try again.');
  }
  
  const config = configHandler.getConfig();
  log('createClient: Retrieved config', { host: config.host, port: config.port, database: config.database, user: config.user, ssl: config.ssl });
  
  if (!configHandler.isConfigured()) {
    log('createClient: Database not configured');
    throw new Error(
      'Database connection not configured. Please use the "config" tool to set up your PostgreSQL connection:\n' +
      '  - host: PostgreSQL server hostname\n' +
      '  - port: PostgreSQL server port (default: 5432)\n' +
      '  - database: Database name\n' +
      '  - user: Database username\n' +
      '  - password: Database password'
    );
  }
  
  // Don't even attempt connection if not configured - fail fast
  if (!config.password || config.password === '') {
    log('createClient: No password configured, failing fast');
    throw new Error(
      'Database password not set. Please configure your PostgreSQL connection first using the "config" tool.'
    );
  }
  
  const client = new Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: config.connectionTimeout,
    query_timeout: config.queryTimeout
  });
  
  try {
    log('createClient: Attempting to connect to database');
    await client.connect();
    log('createClient: Successfully connected to database');
    return client;
  } catch (error) {
    log('createClient: Connection failed');
    logError('createClient: Connection error', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to connect to PostgreSQL database:\n` +
      `  Host: ${config.host}:${config.port}\n` +
      `  Database: ${config.database}\n` +
      `  User: ${config.user}\n` +
      `  SSL: ${config.ssl ? 'enabled' : 'disabled'}\n` +
      `  Error: ${errorMessage}\n` +
      `\nPossible causes:\n` +
      `  - PostgreSQL server is not running\n` +
      `  - Network/firewall blocking connection\n` +
      `  - Invalid credentials\n` +
      `  - Database does not exist\n` +
      `  - SSL configuration mismatch`
    );
  }
}

/**
 * Validate SQL query arguments
 */
function isValidQueryArgs(args: any): args is { query: string; params?: any[] } {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.query === 'string' &&
    (args.params === undefined || Array.isArray(args.params))
  );
}

/**
 * Validate table info arguments
 */
function isValidTableInfoArgs(args: any): args is { schema?: string; table?: string } {
  return (
    typeof args === 'object' &&
    args !== null &&
    (args.schema === undefined || typeof args.schema === 'string') &&
    (args.table === undefined || typeof args.table === 'string')
  );
}

/**
 * Initialize server and set up request handlers
 */
function initializeServer(): void {
  log('initializeServer: Starting server initialization');
  server = new Server(
    {
      name: "dj-postgres-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  /**
   * Handler for listing available database resources
   */
  log('initializeServer: Registering ListResources handler');
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
  log('ListResources: Handler called');
  try {
    // Short-circuit if not initialized or configured
    if (!configHandler || !configHandler.isConfigured()) {
      log('ListResources: Config not initialized or not configured, returning empty resources');
      return { resources: [] };
    }
    
    const client = await createClient();
    
    // Get list of schemas and tables
    const schemaResult = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);
    
    const resources = [];
    
    // Add database overview resource
    resources.push({
      uri: 'postgres://database/overview',
      name: 'Database Overview',
      description: 'Overview of database schemas and tables',
      mimeType: 'application/json'
    });
    
    // Add schema resources
    for (const row of schemaResult.rows) {
      const schema = row.schema_name;
      resources.push({
        uri: `postgres://schema/${schema}`,
        name: `Schema: ${schema}`,
        description: `Tables and views in schema ${schema}`,
        mimeType: 'application/json'
      });
    }
    
    await client.end();
    return { resources };
    
  } catch (error) {
    logError('ListResources: Error listing resources', error);
    log('ListResources: Returning empty resource list due to error');
    return { resources: [] };
  }
  });

  /**
   * Handler for reading database resources
   */
  log('initializeServer: Registering ReadResource handler');
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  log('ReadResource: Handler called', { uri });
  
  if (!configHandler.isConfigured()) {
    throw new McpError(ErrorCode.InvalidRequest, 'Database connection not configured');
  }
  
  const client = await createClient();
  const config = configHandler.getConfig();
  
  try {
    if (uri === 'postgres://database/overview') {
      // Database overview
      const result = await client.query(`
        SELECT 
          schemaname as schema_name,
          tablename as table_name,
          tableowner as table_owner
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        ORDER BY schemaname, tablename
      `);
      
      return {
        contents: [{
          uri: request.params.uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            database: config.database,
            host: config.host,
            port: config.port,
            tables: result.rows
          }, null, 2)
        }]
      };
      
    } else if (uri.startsWith('postgres://schema/')) {
      // Schema details
      const schema = uri.replace('postgres://schema/', '');
      const result = await client.query(`
        SELECT 
          table_name,
          table_type,
          is_insertable_into,
          is_typed
        FROM information_schema.tables 
        WHERE table_schema = $1
        ORDER BY table_name
      `, [schema]);
      
      return {
        contents: [{
          uri: request.params.uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            schema: schema,
            tables: result.rows
          }, null, 2)
        }]
      };
    }
    
    throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    
  } catch (error) {
    if (error instanceof McpError) throw error;
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(
      ErrorCode.InternalError, 
      `Database error while reading resource "${uri}": ${errorMessage}`
    );
  } finally {
    await client.end();
  }
  });

  /**
   * Handler for listing available tools
   */
  log('initializeServer: Registering ListTools handler');
  server.setRequestHandler(ListToolsRequestSchema, async () => {
  log('ListTools: Handler called');
  const configTools = configHandler.getTools();
  const databaseTools = [
    {
      name: "execute_query",
      description: "Execute a SQL query against the PostgreSQL database",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "SQL query to execute"
          },
          params: {
            type: "array",
            description: "Optional parameters for parameterized queries",
            items: {
              type: ["string", "number", "boolean", "null"]
            }
          }
        },
        required: ["query"]
      }
    },
    {
      name: "describe_table",
      description: "Get detailed information about a table structure",
      inputSchema: {
        type: "object",
        properties: {
          schema: {
            type: "string",
            description: "Schema name (default: public)"
          },
          table: {
            type: "string",
            description: "Table name"
          }
        },
        required: ["table"]
      }
    },
    {
      name: "list_tables",
      description: "List all tables in the database or a specific schema",
      inputSchema: {
        type: "object",
        properties: {
          schema: {
            type: "string",
            description: "Schema name to filter by (optional)"
          }
        }
      }
    }
  ];
  
  return {
    tools: [...configTools, ...databaseTools]
  };
  });

  /**
   * Handler for tool execution
   */
  log('initializeServer: Registering CallTool handler');
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  log('CallTool: Handler called', { tool: name, hasArgs: !!args });
  
  try {
    // Ensure config handler is initialized
    if (!configHandler) {
      throw new McpError(ErrorCode.InvalidRequest, 'Server not fully initialized');
    }
    
    // Check if this is a configuration tool
    const configTools = ['config', 'config_get', 'get_supported_clients', 'test_connection'];
    if (configTools.includes(name)) {
      // If config tools are hidden, reject the call
      if (configHandler.getTools().length === 0) {
        throw new McpError(ErrorCode.MethodNotFound, `Tool not available: ${name}`);
      }
      return await configHandler.handleToolCall(name, args);
    }
    
    // For database tools, check if configured before attempting
    if (!configHandler.isConfigured()) {
      throw new McpError(
        ErrorCode.InvalidRequest, 
        'Database not configured. Please use the "config" tool first to set up your PostgreSQL connection.'
      );
    }
    
    // Handle database operation tools
    switch (name) {
      case "execute_query": {
        if (!isValidQueryArgs(args)) {
          throw new McpError(ErrorCode.InvalidParams, "Invalid query arguments");
        }
        
        const client = await createClient();
        try {
          const result = await client.query(args.query, args.params || []);
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                rowCount: result.rowCount,
                rows: result.rows,
                command: result.command,
                fields: result.fields?.map(f => ({
                  name: f.name,
                  dataTypeID: f.dataTypeID
                }))
              }, null, 2)
            }]
          };
        } finally {
          await client.end();
        }
      }
      
      case "describe_table": {
        if (!isValidTableInfoArgs(args)) {
          throw new McpError(ErrorCode.InvalidParams, "Invalid table info arguments");
        }
        
        const schema = args.schema || 'public';
        const table = args.table;
        
        const client = await createClient();
        try {
          const result = await client.query(`
            SELECT 
              column_name,
              data_type,
              is_nullable,
              column_default,
              character_maximum_length,
              numeric_precision,
              numeric_scale
            FROM information_schema.columns 
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position
          `, [schema, table]);
          
          // Get indexes
          const indexResult = await client.query(`
            SELECT 
              indexname,
              indexdef
            FROM pg_indexes 
            WHERE schemaname = $1 AND tablename = $2
          `, [schema, table]);
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                schema: schema,
                table: table,
                columns: result.rows,
                indexes: indexResult.rows
              }, null, 2)
            }]
          };
        } finally {
          await client.end();
        }
      }
      
      case "list_tables": {
        if (!isValidTableInfoArgs(args)) {
          throw new McpError(ErrorCode.InvalidParams, "Invalid arguments");
        }
        
        const client = await createClient();
        try {
          let query = `
            SELECT 
              schemaname as schema_name,
              tablename as table_name,
              tableowner as table_owner,
              hasindexes,
              hasrules,
              hastriggers
            FROM pg_tables 
            WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
          `;
          
          const params = [];
          if (args.schema) {
            query += ' AND schemaname = $1';
            params.push(args.schema);
          }
          
          query += ' ORDER BY schemaname, tablename';
          
          const result = await client.query(query, params);
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                tables: result.rows
              }, null, 2)
            }]
          };
        } finally {
          await client.end();
        }
      }
      
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    
  } catch (error) {
    if (error instanceof McpError) throw error;
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = [
      `Tool: ${name}`,
      `Error: ${errorMessage}`,
    ];
    
    // Add context-specific help based on the error
    if (errorMessage.includes('timeout')) {
      errorDetails.push('\nTimeout-related error. Consider:');
      errorDetails.push('  - Increasing connection timeout in configuration');
      errorDetails.push('  - Checking network connectivity to database');
      errorDetails.push('  - Verifying database server is responding');
    } else if (errorMessage.includes('ECONNREFUSED')) {
      errorDetails.push('\nConnection refused. Check:');
      errorDetails.push('  - PostgreSQL server is running');
      errorDetails.push('  - Host and port are correct');
      errorDetails.push('  - Firewall rules allow connection');
    } else if (errorMessage.includes('authentication') || errorMessage.includes('password')) {
      errorDetails.push('\nAuthentication failed. Verify:');
      errorDetails.push('  - Username and password are correct');
      errorDetails.push('  - User has permission to access database');
      errorDetails.push('  - pg_hba.conf allows connection from your host');
    }
    
    return {
      content: [{
        type: "text",
        text: errorDetails.join('\n')
      }],
      isError: true
    };
    }
  });
  log('initializeServer: All handlers registered successfully');
}

/**
 * Start the server
 */
async function main() {
  log('main: Starting PostgreSQL MCP Server v1.0.0');
  log('main: Server details', { name: 'dj-postgres-mcp', version: '1.0.0', nodeVersion: process.version });
  try {
    // Initialize configuration handler with default config immediately
    log('main: Creating config handler');
    configHandler = new McpConfigHandler(false);
    
    // Initialize server to establish MCP connection quickly
    log('main: Initializing server');
    initializeServer();
    
    // Create and connect transport immediately
    log('main: Creating stdio transport');
    const transport = new StdioServerTransport();
    log('main: Connecting server to transport');
    await server.connect(transport);
    log('main: Server connected successfully');
    
    // Load configuration asynchronously after connection is established
    // This prevents client timeouts during startup
    log('main: Starting async config initialization');
    configHandler.initialize().then(() => {
      log('main: Configuration loaded successfully');
    }).catch((error) => {
      logError('main: Configuration initialization failed', error);
      log('main: Using default configuration');
    });
    
    log('main: Server running on stdio');
  } catch (error) {
    logError('main: Fatal error during server startup', error);
    log('main: Common causes:');
    log('  - MCP client connection failed');
    log('  - Invalid server setup');
    log('  - Permission issues');
    throw error;
  }
}

// Error handling
process.on('SIGINT', async () => {
  log('Process: Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logError('Process: Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('Process: Unhandled promise rejection', { reason: String(reason), promise: String(promise) });
  process.exit(1);
});

main().catch((error) => {
  logError('main: Server failed to start', error);
  log('main: Exit code: 1');
  process.exit(1);
});
