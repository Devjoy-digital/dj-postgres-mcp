import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { QueryExecutor } from '../QueryExecutor.js';
import { ManagedError, ErrorCodes } from '../../shared/errors.js';
import { ConfigHandler } from '../../../handlers/ConfigHandler.js';
import { Client } from 'pg';

export function createExecuteQueryTool(): Tool {
  return {
    name: 'execute_query',
    description: 'Execute a SQL query against the configured PostgreSQL database',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SQL query to execute'
        },
        params: {
          type: 'array',
          description: 'Query parameters for parameterized queries',
          items: {
            type: ['string', 'number', 'boolean', 'null']
          }
        }
      },
      required: ['query']
    }
  };
}

export async function handleExecuteQuery(
  args: any,
  configHandler: ConfigHandler
) {
  if (!args.query || typeof args.query !== 'string') {
    throw new ManagedError(
      ErrorCodes.INVALID_PARAMS,
      'query is required and must be a string'
    );
  }

  if (args.params && !Array.isArray(args.params)) {
    throw new ManagedError(
      ErrorCodes.INVALID_PARAMS,
      'params must be an array'
    );
  }

  // Validate parameters are basic types
  if (args.params) {
    for (const param of args.params) {
      const type = typeof param;
      if (param !== null && type !== 'string' && type !== 'number' && type !== 'boolean') {
        throw new ManagedError(
          ErrorCodes.INVALID_PARAMS,
          'Query parameters must be string, number, boolean, or null'
        );
      }
    }
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
    const result = await queryExecutor.executeQuery(client, args.query, args.params);
    
    return {
      content: [{
        type: 'text',
        text: `📊 Query Results\n\n${JSON.stringify(result, null, 2)}`
      }]
    };
  } finally {
    await client.end();
  }
}
