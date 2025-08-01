import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { QueryExecutor } from '../QueryExecutor.js';
import { ManagedError, ErrorCodes } from '../../shared/errors.js';
import { ConfigHandler } from '../../../handlers/ConfigHandler.js';
import { Client } from 'pg';

export function createListTablesTool(): Tool {
  return {
    name: 'list_tables',
    description: 'List all tables in the configured PostgreSQL database or a specific schema',
    inputSchema: {
      type: 'object',
      properties: {
        schema: {
          type: 'string',
          description: 'Schema name to filter by (optional - lists all schemas if not provided)'
        }
      }
    }
  };
}

export async function handleListTables(
  args: any,
  configHandler: ConfigHandler
) {
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
    const tables = await queryExecutor.listTables(client, args.schema);
    
    return {
      content: [{
        type: 'text',
        text: `🗄️ Tables in Database\n\n${JSON.stringify({ tables }, null, 2)}`
      }]
    };
  } finally {
    await client.end();
  }
}
