/**
 * McpConfigHandler.ts - Configuration management handler using mcp-config
 * 
 * This handler manages the server configuration using the mcp-config system,
 * including database connection setup and other user preferences.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  McpError,
  ErrorCode 
} from '@modelcontextprotocol/sdk/types.js';
import { PostgresConfig, ConnectionTestResult } from '../models/Config.js';
import { Client } from 'pg';
import { log, logError } from '../utils/logger.js';

// Import mcp-config utilities
const configUtils = await import('dj-config-mcp/src/config-utils.js');
const { 
  isSensitiveKey, 
  saveSecretToEnv, 
  getConfigValue, 
  saveNonSecretToConfig, 
  getAllConfigKeys,
  distributeConfigToClients
} = configUtils;

/**
 * McpConfigHandler class manages all configuration-related operations
 * using the mcp-config system
 */
export class McpConfigHandler {
  private config: PostgresConfig;
  private hideConfigTools: boolean;

  /**
   * Constructor for McpConfigHandler
   */
  constructor(hideConfigTools: boolean = false) {
    log('McpConfigHandler: Constructor called', { hideConfigTools });
    this.config = this.getDefaultConfig();
    this.hideConfigTools = hideConfigTools;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): PostgresConfig {
    return {
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: '',
      ssl: true,
      connectionTimeout: 30000,
      queryTimeout: 60000,
      maxConnections: 10,
      autoRetry: true
    };
  }

  /**
   * Initializes the configuration handler
   * This loads existing configuration from the mcp-config system
   */
  async initialize(): Promise<void> {
    log('McpConfigHandler.initialize: Starting config initialization');
    try {
      await this.loadConfig();
      log('McpConfigHandler.initialize: Config loaded successfully');
    } catch (error) {
      logError('McpConfigHandler.initialize: Config load failed', error);
      log('McpConfigHandler.initialize: Using default configuration');
    }
  }

  /**
   * Load configuration using mcp-config system
   */
  private async loadConfig(): Promise<void> {
    log('McpConfigHandler.loadConfig: Starting config load');
    try {
      // Load configuration values using mcp-config
      const configKeys = [
        'postgres.host',
        'postgres.port',
        'postgres.database',
        'postgres.user',
        'postgres.password',
        'postgres.ssl',
        'postgres.connectionTimeout',
        'postgres.queryTimeout',
        'postgres.maxConnections',
        'postgres.autoRetry'
      ];

      for (const key of configKeys) {
        const result = getConfigValue(key);
        if (result.value !== undefined) {
          const propName = key.split('.')[1];
          switch (propName) {
            case 'host':
              this.config.host = result.value;
              break;
            case 'port':
              this.config.port = Number(result.value);
              break;
            case 'database':
              this.config.database = result.value;
              break;
            case 'user':
              this.config.user = result.value;
              break;
            case 'password':
              this.config.password = result.value;
              break;
            case 'ssl':
              this.config.ssl = result.value === 'true' || result.value === true;
              break;
            case 'connectionTimeout':
              this.config.connectionTimeout = Number(result.value);
              break;
            case 'queryTimeout':
              this.config.queryTimeout = Number(result.value);
              break;
            case 'maxConnections':
              this.config.maxConnections = Number(result.value);
              break;
            case 'autoRetry':
              this.config.autoRetry = result.value === 'true' || result.value === true;
              break;
          }
          log(`McpConfigHandler.loadConfig: Loaded ${key} from ${result.source}`);
        }
      }
      
      log('McpConfigHandler.loadConfig: Config load completed');
    } catch (error) {
      logError('McpConfigHandler.loadConfig: Config load error', error);
    }
  }

  /**
   * Handles tool calls for this handler
   */
  async handleToolCall(toolName: string, args: any): Promise<any> {
    log('McpConfigHandler.handleToolCall: Tool call received', { toolName, hasArgs: !!args });
    switch (toolName) {
      case 'config_connection':
      case 'config':
        return await this.handleConfig(args);
      
      case 'config_get':
        return await this.handleConfigGet();
      
      case 'get_connection_info':
        return await this.handleGetConnectionInfo();
      
      case 'get_supported_clients':
        return await this.handleGetSupportedClients();
      
      case 'test_connection':
        return await this.handleTestConnection();
      
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
    }
  }

  /**
   * Gets the list of tools provided by this handler
   */
  getTools(): any[] {
    if (this.hideConfigTools) {
      return [];
    }

    return [
      {
        name: 'config',
        description: 'Configure database connection settings and manage configuration',
        inputSchema: {
          type: 'object',
          properties: {
            clients: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['VS Code', 'Claude Code', 'Claude Desktop', 'Cursor']
              },
              description: 'List of client applications to configure'
            },
            host: {
              type: 'string',
              description: 'Database host (e.g., localhost or Azure hostname)'
            },
            port: {
              type: 'number',
              description: 'Database port (default: 5432)'
            },
            database: {
              type: 'string',
              description: 'Database name'
            },
            user: {
              type: 'string',
              description: 'Database username'
            },
            password: {
              type: 'string',
              description: 'Database password'
            },
            ssl: {
              type: 'boolean',
              description: 'Enable SSL connection (required for Azure)'
            },
            connectionTimeout: {
              type: 'number',
              description: 'Connection timeout in milliseconds'
            },
            queryTimeout: {
              type: 'number',
              description: 'Query timeout in milliseconds'
            },
            description: {
              type: 'string',
              description: 'Description for this database connection'
            },
            global: {
              type: 'boolean',
              description: 'Configure globally (default: false)',
              default: false
            }
          },
          required: ['host', 'database', 'user', 'password']
        }
      },
      {
        name: 'config_get',
        description: 'Get current database connection configuration (local and global)',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_supported_clients',
        description: 'Get list of supported client applications for configuration distribution',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'test_connection',
        description: 'Test the database connection with current settings',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  /**
   * Handles the config tool call
   */
  private async handleConfig(args: any): Promise<any> {
    log('handleConfig: Starting config update', { hasArgs: !!args });
    try {
      const { 
        clients,
        host, port, database, user, password, 
        ssl, connectionTimeout, queryTimeout, 
        description, global = false 
      } = args;
      
      log('handleConfig: Parsed arguments', {
        hasClients: !!clients,
        host, port, database, user,
        hasPassword: !!password,
        ssl, global
      });

      // Validate required parameters
      if (!host || !database || !user || !password) {
        log('handleConfig: Missing required parameters');
        throw new McpError(ErrorCode.InvalidParams, 'host, database, user, and password are required');
      }

      // Save non-sensitive configuration using mcp-config
      const configKeys = {
        'postgres.host': host,
        'postgres.port': port || 5432,
        'postgres.database': database,
        'postgres.user': user,
        'postgres.ssl': ssl !== undefined ? ssl : true,
        'postgres.connectionTimeout': connectionTimeout || 30000,
        'postgres.queryTimeout': queryTimeout || 60000,
        'postgres.maxConnections': 10,
        'postgres.autoRetry': true
      };

      // Save each config value
      for (const [key, value] of Object.entries(configKeys)) {
        if (isSensitiveKey(key)) {
          saveSecretToEnv(key, String(value));
        } else {
          saveNonSecretToConfig(key, value, global);
        }
      }

      // Save password as sensitive data
      saveSecretToEnv('POSTGRES_PASSWORD', password);

      // If clients are provided, save them
      if (clients && Array.isArray(clients)) {
        const supportedClients = ['VS Code', 'Claude Code', 'Claude Desktop', 'Cursor'];
        const invalidClients = clients.filter(client => !supportedClients.includes(client));
        
        if (invalidClients.length > 0) {
          throw new McpError(ErrorCode.InvalidParams, `Unsupported clients: ${invalidClients.join(', ')}. Supported clients: ${supportedClients.join(', ')}`);
        }

        saveNonSecretToConfig('clients.selected', clients, global);
        
        // Distribute config to selected clients
        if (!global) {
          distributeConfigToClients(clients);
        }
      }

      // Reload configuration
      log('handleConfig: Reloading configuration');
      await this.loadConfig();
      log('handleConfig: Configuration reloaded');

      // Test the connection
      log('handleConfig: Testing connection');
      const testResult = await this.testConnectionInternal();
      log('handleConfig: Connection test completed', { success: testResult.success });
      
      let connectionStatus = '';
      if (testResult.success) {
        connectionStatus = `- Server Version: ${testResult.version}
- Connection Latency: ${testResult.latency}ms`;
      } else {
        connectionStatus = `- Connection Status: Configuration saved (test failed: ${testResult.error})`;
      }

      return {
        content: [{
          type: 'text',
          text: `✅ Database connection configured successfully using mcp-config!

Connection Details:
- Host: ${this.config.host}:${this.config.port}
- Database: ${this.config.database}
- User: ${this.config.user}
- SSL: ${this.config.ssl ? 'enabled' : 'disabled'}
${connectionStatus}
${description ? `- Description: ${description}` : ''}
${global ? '⚠️  Global configuration enabled' : ''}

Configuration has been saved using the mcp-config system.

You can now use other database tools to interact with your PostgreSQL database.`
        }]
      };
    } catch (error) {
      logError('handleConfig: Error during configuration', error);
      if (error instanceof McpError) {
        throw error;
      }
      
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to configure connection: ${error}`
        }],
        isError: true
      };
    }
  }

  /**
   * Handles the config_get tool call
   */
  private async handleConfigGet(): Promise<any> {
    log('handleConfigGet: Starting');
    try {
      const keys = getAllConfigKeys();
      const postgresKeys = keys.filter((key: string) => key.startsWith('postgres.'));
      
      let response = `📋 PostgreSQL Configuration Status\n\n`;
      response += `**Current Configuration:**\n`;
      
      for (const key of postgresKeys) {
        const result = getConfigValue(key);
        if (result.value !== undefined) {
          const displayKey = key.replace('postgres.', '');
          const displayValue = displayKey === 'password' ? '****' : result.value;
          response += `  ${displayKey}: ${displayValue} (Source: ${result.source})\n`;
        }
      }
      
      // Get client selections
      const clientsResult = getConfigValue('clients.selected');
      if (clientsResult.value) {
        response += `\n**Selected Clients:** ${clientsResult.value.join(', ')}`;
      }
      
      return {
        content: [{
          type: 'text',
          text: response
        }]
      };
    } catch (error) {
      logError('handleConfigGet: Error', error);
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to get configuration: ${error}`
        }],
        isError: true
      };
    }
  }

  /**
   * Handles the get_connection_info tool call
   */
  private async handleGetConnectionInfo(): Promise<any> {
    try {
      const clientsResult = getConfigValue('clients.selected');
      
      const configInfo = {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        ssl: this.config.ssl,
        connectionTimeout: this.config.connectionTimeout,
        queryTimeout: this.config.queryTimeout,
        maxConnections: this.config.maxConnections,
        autoRetry: this.config.autoRetry,
        password_configured: !!this.config.password,
        selected_clients: clientsResult.value || [],
        configuration_source: 'mcp-config system'
      };

      return {
        content: [{
          type: 'text',
          text: `📋 Current PostgreSQL Configuration (via mcp-config):

${JSON.stringify(configInfo, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to get configuration: ${error}`
        }],
        isError: true
      };
    }
  }

  /**
   * Handles the get_supported_clients tool call
   */
  private async handleGetSupportedClients(): Promise<any> {
    try {
      const supportedClients = ['VS Code', 'Claude Code', 'Claude Desktop', 'Cursor'];
      const clientsResult = getConfigValue('clients.selected');
      const currentClients = clientsResult.value || [];

      return {
        content: [{
          type: 'text',
          text: `📱 Supported Client Applications for Configuration Distribution:

**Available Clients:**
${supportedClients.map(client => `- ${client}`).join('\n')}

**Currently Selected:** ${currentClients.length > 0 ? currentClients.join(', ') : 'None'}

**What this does:**
When you configure clients, the mcp-config system will automatically create configuration files for each selected client application. This allows the postgres-mcp-server to be easily discovered and used by your preferred development tools.

**Platform Support:**
- Windows: AppData/Roaming paths
- macOS: Library/Application Support paths  
- Linux: ~/.config paths

Use the 'config' tool with the 'clients' parameter to select which applications should receive this server's configuration.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to get supported clients: ${error}`
        }],
        isError: true
      };
    }
  }

  /**
   * Handles the test_connection tool call
   */
  private async handleTestConnection(): Promise<any> {
    try {
      const result = await this.testConnectionInternal();

      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `✅ Connection test successful!

Connection Details:
- Host: ${this.config.host}:${this.config.port}
- Database: ${this.config.database}
- User: ${this.config.user}
- SSL: ${this.config.ssl ? 'enabled' : 'disabled'}
- Server Version: ${result.version}
- Server Time: ${result.serverTime}
- Connection Latency: ${result.latency}ms

Configuration managed by: mcp-config system`
          }]
        };
      } else {
        return {
          content: [{
            type: 'text',
            text: `❌ Connection test failed!

Error: ${result.error}

Configuration tested:
- Host: ${this.config.host}:${this.config.port}
- Database: ${this.config.database}
- User: ${this.config.user}
- SSL: ${this.config.ssl ? 'enabled' : 'disabled'}

Use the 'config' tool to fix the configuration.`
          }],
          isError: true
        };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Connection test error: ${error}`
        }],
        isError: true
      };
    }
  }

  /**
   * Internal method to test database connection
   */
  private async testConnectionInternal(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      const client = new Client({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: this.config.connectionTimeout,
        query_timeout: this.config.queryTimeout
      });

      await client.connect();
      
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      const latency = Date.now() - startTime;
      
      await client.end();

      return {
        success: true,
        version: result.rows[0].version,
        serverTime: result.rows[0].current_time,
        latency: latency
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      let detailedError = errorMessage;
      
      if (errorMessage.includes('ECONNREFUSED')) {
        detailedError = `Connection refused to ${this.config.host}:${this.config.port} - PostgreSQL server may not be running`;
      } else if (errorMessage.includes('ENOTFOUND')) {
        detailedError = `Host "${this.config.host}" not found - check hostname/DNS`;
      } else if (errorMessage.includes('timeout')) {
        detailedError = `Connection timeout after ${this.config.connectionTimeout}ms - server may be unreachable`;
      } else if (errorMessage.includes('password authentication failed')) {
        detailedError = `Authentication failed for user "${this.config.user}" - check credentials`;
      } else if (errorMessage.includes('database') && errorMessage.includes('does not exist')) {
        detailedError = `Database "${this.config.database}" does not exist`;
      }
      
      return {
        success: false,
        error: detailedError,
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Gets the current configuration
   */
  getConfig(): PostgresConfig {
    return { ...this.config };
  }

  /**
   * Checks if the database connection is configured
   */
  isConfigured(): boolean {
    const configured = !!(this.config.host && this.config.database && this.config.user && this.config.password);
    log('McpConfigHandler.isConfigured', { configured, hasPassword: !!this.config.password });
    return configured;
  }
}