import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { QueryExecutor } from '../QueryExecutor.js';
import { ManagedError, ErrorCodes } from '../../shared/errors.js';
import { ConfigHandler } from '../../../handlers/ConfigHandler.js';
import { Client } from 'pg';

export function createDescribeTableTool(): Tool {
  return {
    name: 'describe_table',
    description: 'Get detailed information about a table structure in the configured PostgreSQL database',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Table name'
        },
        schema: {
          type: 'string',
          description: 'Schema name (default: "public")'
        }
      },
      required: ['table']
    }
  };
}

export async function handleDescribeTable(
  args: any,
  configHandler: ConfigHandler
) {
  if (!args.table || typeof args.table !== 'string') {
    throw new ManagedError(
      ErrorCodes.INVALID_PARAMS,
      'table is required and must be a string'
    );
  }

  if (args.schema && typeof args.schema !== 'string') {
    throw new ManagedError(
      ErrorCodes.INVALID_PARAMS,
      'schema must be a string'
    );
  }

  // Check if connection is configured
  if (!configHandler.isConfigured()) {
    throw new ManagedError(
      ErrorCodes.NO_CONNECTION,
      'Database connection not configured. Use configure_connection tool first'
    );
  }

  const config = configHandler.getConfig();
  const queryExecutor = new QueryExecutor();

  // Create database client
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
    await client.connect();
    const description = await queryExecutor.describeTable(
      client,
      args.table,
      args.schema || 'public'
    );
    
    return {
      content: [{
        type: 'text',
        text: `📝 Table Structure\n\n${JSON.stringify(description, null, 2)}`
      }]
    };
  } finally {
    await client.end();
  }
}
