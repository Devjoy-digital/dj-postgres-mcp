import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';


// Database tools
import { createExecuteQueryTool, handleExecuteQuery } from './features/database/tools/execute-query.js';
import { createListTablesTool, handleListTables } from './features/database/tools/list-tables.js';
import { createDescribeTableTool, handleDescribeTable } from './features/database/tools/describe-table.js';

// Configuration handler
import { ConfigHandler } from './handlers/ConfigHandler.js';

import { log, logError } from './features/shared/logger.js';
import { ManagedError } from './features/shared/errors.js';

export class PostgresServer {
  private server: Server;
  private configHandler: ConfigHandler;

  constructor() {
    log('PostgresServer: Initializing');
    
    this.server = new Server(
      {
        name: 'dj-postgres-mcp',
        version: '0.9.1',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.configHandler = new ConfigHandler();

    this.setupHandlers();
    
    log('PostgresServer: Initialization complete');
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      log('PostgresServer: ListTools request');
      
      return {
        tools: [
          // Configuration tools
          ...this.configHandler.getTools(),
          // Database tools
          createExecuteQueryTool(),
          createListTablesTool(),
          createDescribeTableTool()
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      log('PostgresServer: Tool call', { tool: name });

      try {
        // Check if it's a configuration tool first
        const configTools = ['configure_connection', 'get_connection_info', 'test_connection', 'list_available_clients'];
        if (configTools.includes(name)) {
          return await this.configHandler.handleToolCall(name, args);
        }

        switch (name) {
          case 'execute_query':
            return await handleExecuteQuery(args, this.configHandler);
          
          case 'list_tables':
            return await handleListTables(args, this.configHandler);
          
          case 'describe_table':
            return await handleDescribeTable(args, this.configHandler);
          
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        logError('PostgresServer: Tool execution failed', error, { tool: name });
        
        if (error instanceof McpError) {
          throw error;
        }
        
        if (error instanceof ManagedError) {
          throw new McpError(
            ErrorCode.InternalError,
            error.message,
            error.details
          );
        }
        
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(ErrorCode.InternalError, message);
      }
    });
  }

  getServer(): Server {
    return this.server;
  }

  async cleanup(): Promise<void> {
    log('PostgresServer: Cleanup initiated');
  }
}
