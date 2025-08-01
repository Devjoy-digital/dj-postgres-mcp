/**
 * ConfigHandler.ts - Configuration management for PostgreSQL MCP server
 *
 * This handler provides tools for configuring database connections.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { Client } from 'pg';
import { log, logError } from '../features/shared/logger.js';
import { MessageFormatter } from '../features/shared/message-formatter.js';

// Import the dj-config-mcp library using dynamic import
let djConfig: any;

// Initialize dj-config-mcp
async function initializeDjConfig() {
  try {
    const module = await import('dj-config-mcp');
    djConfig = module.default || module;
    log('ConfigHandler: dj-config-mcp initialized');
  } catch (error) {
    logError('ConfigHandler: Failed to import dj-config-mcp', error);
    throw new Error('dj-config-mcp is required but not installed. Please install it with: npm install dj-config-mcp');
  }
}

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  connectionTimeout: number;
  queryTimeout: number;
}

/**
 * ConfigHandler class manages PostgreSQL configuration and client setup
 */
export class ConfigHandler {
  private config: PostgresConfig;
  private djConfigInitPromise: Promise<void> | null = null;

  constructor() {
    log('ConfigHandler: Constructor called');
    this.config = this.getDefaultConfig();
    this.initializeDjConfigAsync();
  }

  private async initializeDjConfigAsync() {
    if (!this.djConfigInitPromise) {
      this.djConfigInitPromise = initializeDjConfig();
    }
    await this.djConfigInitPromise;
  }

  /**
   * Get default PostgreSQL configuration from environment variables
   */
  private getDefaultConfig(): PostgresConfig {
    return {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE || 'postgres',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      ssl: process.env.POSTGRES_SSL === 'true',
      connectionTimeout: 30000,
      queryTimeout: 60000
    };
  }



  /**
   * Gets the list of tools provided by this handler
   */
  getTools(): any[] {
    return [
      {
        name: 'configure_connection',
        description: 'Configure PostgreSQL database connection settings',
        inputSchema: {
          type: 'object',
          properties: {
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
              description: 'Enable SSL connection (required for cloud databases)'
            },
            clients: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['claude-desktop', 'vscode-mcp', 'cline']
              },
              description: 'Array of client names to distribute configuration to (optional). Select from available options.',
              default: ['claude-desktop', 'vscode-mcp', 'cline']
            }
          },
          required: ['host', 'database', 'user', 'password']
        }
      },
      {
        name: 'get_connection_info',
        description: 'Get current database connection configuration',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'test_connection',
        description: 'Test the current database connection',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'list_available_clients',
        description: 'List available MCP clients that can receive PostgreSQL configuration',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  /**
   * Handles tool calls for this handler
   */
  async handleToolCall(toolName: string, args: any): Promise<any> {
    log('ConfigHandler.handleToolCall: Tool call received', { toolName, hasArgs: !!args });
    
    switch (toolName) {
      case 'configure_connection':
        return await this.handleConfigConnection(args);
      case 'get_connection_info':
        return await this.handleGetConnectionInfo();
      case 'test_connection':
        return await this.handleTestConnection();
      case 'list_available_clients':
        return await this.handleListAvailableClients();
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
    }
  }

  /**
   * Handle database connection configuration
   */
  private async handleConfigConnection(args: any): Promise<any> {
    try {
      const { host, port, database, user, password, ssl, clients } = args;

      // Validate required parameters
      if (!host || !database || !user || !password) {
        throw new McpError(
          ErrorCode.InvalidParams,
          MessageFormatter.error.validation('parameters', 'host, database, user, and password are required')
        );
      }

      // Initialize dj-config-mcp first
      await this.initializeDjConfigAsync();
      
      // Get available clients from dj-config-mcp
      const availableClients = await this.getAvailableClientsFromDjConfig();
      
      // If no clients specified, use all available clients by default
      let selectedClients = clients;
      if (!clients || !Array.isArray(clients)) {
        selectedClients = availableClients.map(client => client.name);
        log('ConfigHandler: No clients specified, using all available clients', { selectedClients });
      }

      // Update configuration
      this.config = {
        host,
        port: port || 5432,
        database,
        user,
        password,
        ssl: ssl !== undefined ? ssl : true,
        connectionTimeout: 30000,
        queryTimeout: 60000
      };

      // Store configuration values using dj-config-mcp
      // dj-config-mcp will automatically detect password as sensitive and store in .env
      await djConfig.configSet('postgres.host', host);
      await djConfig.configSet('postgres.port', (port || 5432).toString());
      await djConfig.configSet('postgres.database', database);
      await djConfig.configSet('postgres.user', user);
      await djConfig.configSet('postgres.password', password);
      await djConfig.configSet('postgres.ssl', (ssl !== undefined ? ssl : true).toString());
      
      // Store clients configuration
      if (selectedClients && Array.isArray(selectedClients) && selectedClients.length > 0) {
        await djConfig.configSet('postgres.clients', JSON.stringify(selectedClients));
        
        // Note: Client distribution will be handled by dj-config-mcp automatically
        // when the configuration is accessed by those clients
        log('ConfigHandler: Configuration saved for clients', { clients: selectedClients });
      } else {
        // Clear clients configuration if not provided
        await djConfig.configSet('postgres.clients', JSON.stringify([]));
      }
      
      log('ConfigHandler: Configuration saved using dj-config-mcp');

      // Test the connection
      const testResult = await this.testConnectionInternal();

      let statusMessage = '';
      if (testResult.success) {
        statusMessage = MessageFormatter.success.connection(
          `- Server Version: ${testResult.version}\\n- Connection Latency: ${testResult.latency}ms`
        );
      } else {
        statusMessage = MessageFormatter.warning.general(`Connection test failed: ${testResult.error}`);
      }

      // Build response message
      let responseMessage = `${MessageFormatter.headers.configuration()}\\n\\n${MessageFormatter.info.configuration(
        this.config.host,
        this.config.port,
        this.config.database,
        this.config.user,
        this.config.ssl
      )}\\n\\n${statusMessage}`;

      // Show available clients and selected clients
      responseMessage += `\\n\\n🔍 Available Clients:\\n${availableClients.map((client, index) => `${index + 1}. ${client.name} (${client.type})`).join('\\n')}`;

      // Add client distribution info
      if (selectedClients && Array.isArray(selectedClients) && selectedClients.length > 0) {
        responseMessage += `\\n\\n📤 Configuration Distributed To:\\n${selectedClients.map((client, index) => `${index + 1}. ${client}`).join('\\n')}`;
      } else {
        responseMessage += `\\n\\n⚠️ No clients configured for distribution`;
      }

      responseMessage += `\\n\\n${MessageFormatter.info.general('Configuration saved using dj-config-mcp')}`;

      return {
        content: [{
          type: 'text',
          text: responseMessage
        }]
      };
    } catch (error) {
      logError('ConfigHandler.handleConfigConnection: Error', error);
      if (error instanceof McpError) {
        throw error;
      }
      return {
        content: [{
          type: 'text',
          text: MessageFormatter.error.configuration(String(error))
        }],
        isError: true
      };
    }
  }



  /**
   * Handle get connection info
   */
  private async handleGetConnectionInfo(): Promise<any> {
    await this.initializeDjConfigAsync();
    
    // Load configuration from dj-config-mcp
    const hostConfig = await djConfig.configGet('postgres.host');
    const portConfig = await djConfig.configGet('postgres.port');
    const databaseConfig = await djConfig.configGet('postgres.database');
    const userConfig = await djConfig.configGet('postgres.user');
    const sslConfig = await djConfig.configGet('postgres.ssl');
    const passwordConfig = await djConfig.configGet('postgres.password');
    const clientsConfig = await djConfig.configGet('postgres.clients');
    
    const host = hostConfig?.value || this.config.host;
    const port = parseInt(portConfig?.value || this.config.port.toString());
    const database = databaseConfig?.value || this.config.database;
    const user = userConfig?.value || this.config.user;
    const ssl = (sslConfig?.value || this.config.ssl.toString()) === 'true';
    const passwordConfigured = !!(passwordConfig?.value || this.config.password);
    
    // Parse clients configuration
    let configuredClients: string[] = [];
    try {
      if (clientsConfig?.value) {
        configuredClients = JSON.parse(clientsConfig.value);
      }
    } catch (error) {
      logError('ConfigHandler: Error parsing clients configuration', error);
    }
    
    const configInfo = {
      host,
      port,
      database,
      user,
      ssl,
      passwordConfigured,  // Use camelCase for consistency with other app-level fields
      configuredClients
    };

    return {
      content: [{
        type: 'text',
        text: `📋 Current PostgreSQL Configuration

${JSON.stringify(configInfo, null, 2)}

💡 Configuration managed by dj-config-mcp`
      }]
    };
  }

  /**
   * Handle test connection
   */
  private async handleTestConnection(): Promise<any> {
    const result = await this.testConnectionInternal();
    
    if (result.success) {
      return {
        content: [{
          type: 'text',
          text: `✅ Connection Test Successful!

Connection Details:
- Host: ${this.config.host}:${this.config.port}
- Database: ${this.config.database}
- User: ${this.config.user}
- SSL: ${this.config.ssl ? 'enabled' : 'disabled'}
- Server Version: ${result.version}
- Connection Latency: ${result.latency}ms`
        }]
      };
    } else {
      return {
        content: [{
          type: 'text',
          text: `❌ Connection Test Failed

Error: ${result.error}

Please check your connection settings using 'configure_connection'`
        }],
        isError: true
      };
    }
  }


  /**
   * Test database connection internally
   */
  private async testConnectionInternal(): Promise<any> {
    const startTime = Date.now();
    try {
      // Load configuration from dj-config-mcp if available
      if (this.djConfigInitPromise) {
        const hostConfig = await djConfig.configGet('postgres.host');
        const portConfig = await djConfig.configGet('postgres.port');
        const databaseConfig = await djConfig.configGet('postgres.database');
        const userConfig = await djConfig.configGet('postgres.user');
        const passwordConfig = await djConfig.configGet('postgres.password');
        const sslConfig = await djConfig.configGet('postgres.ssl');
        
        if (hostConfig?.value) this.config.host = hostConfig.value;
        if (portConfig?.value) this.config.port = parseInt(portConfig.value);
        if (databaseConfig?.value) this.config.database = databaseConfig.value;
        if (userConfig?.value) this.config.user = userConfig.value;
        if (passwordConfig?.value) this.config.password = passwordConfig.value;
        if (sslConfig?.value !== null && sslConfig?.value !== undefined) this.config.ssl = sslConfig.value === 'true';
      }
      
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
      const result = await client.query('SELECT version() as version');
      const latency = Date.now() - startTime;
      await client.end();

      return {
        success: true,
        version: result.rows[0].version,
        latency: latency
      };
    } catch (error) {
      logError('ConfigHandler.testConnectionInternal: Connection test failed', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage || 'Unknown connection error',
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): PostgresConfig {
    return { ...this.config };
  }

  /**
   * Check if database connection is configured
   */
  isConfigured(): boolean {
    return !!(this.config.host && this.config.database && this.config.user && this.config.password);
  }

  /**
   * Handle list available clients
   */
  private async handleListAvailableClients(): Promise<any> {
    try {
      await this.initializeDjConfigAsync();
      
      // Get available clients from dj-config-mcp
      const availableClients = await this.getAvailableClientsFromDjConfig();
      
      return {
        content: [{
          type: 'text',
          text: `🔍 Available MCP Clients for PostgreSQL Configuration Distribution\n\n${availableClients.map((client, index) => `${index + 1}. ${client.name} (${client.type})`).join('\n')}\n\n💡 To configure PostgreSQL with client distribution:\n- Use 'configure_connection' tool\n- Include a 'clients' array parameter with the client names you want\n- If no clients are specified, all available clients will be selected by default\n\nExample clients array: ["claude-desktop", "vscode-mcp", "cline"]`
        }]
      };
    } catch (error) {
      logError('ConfigHandler.handleListAvailableClients: Error', error);
      return {
        content: [{
          type: 'text',
          text: `❌ Error listing available clients: ${error instanceof Error ? error.message : String(error)}\n\nThis feature requires dj-config-mcp to be properly configured with client information.`
        }],
        isError: true
      };
    }
  }

  /**
   * Get available clients from dj-config-mcp
   * This is a helper method that interfaces with dj-config-mcp's client discovery
   */
  private async getAvailableClientsFromDjConfig(): Promise<Array<{name: string, type: string}>> {
    try {
      // This would typically query dj-config-mcp for configured clients
      // For now, we'll return a basic implementation that looks for common MCP client configurations
      
      // Try to get client configurations from dj-config-mcp
      const clientConfigs = [];
      
      // Check for common MCP client types
      const commonClients = [
        { key: 'claude.desktop', name: 'claude-desktop', type: 'Desktop Application' },
        { key: 'vscode.mcp', name: 'vscode-mcp', type: 'VSCode Extension' },
        { key: 'cline.mcp', name: 'cline', type: 'VSCode Extension' }
      ];
      
      for (const client of commonClients) {
        try {
          const config = await djConfig.configGet(`clients.${client.key}`);
          if (config?.value) {
            clientConfigs.push({
              name: client.name,
              type: client.type
            });
          }
        } catch (error) {
          // Client not configured, skip
        }
      }
      
      // If no specific client configs found, return some default options
      if (clientConfigs.length === 0) {
        return [
          { name: 'claude-desktop', type: 'Desktop Application' },
          { name: 'vscode-mcp', type: 'VSCode Extension' },
          { name: 'cline', type: 'VSCode Extension' }
        ];
      }
      
      return clientConfigs;
    } catch (error) {
      logError('ConfigHandler.getAvailableClientsFromDjConfig: Error', error);
      // Return default client options as fallback
      return [
        { name: 'claude-desktop', type: 'Desktop Application' },
        { name: 'vscode-mcp', type: 'VSCode Extension' },
        { name: 'cline', type: 'VSCode Extension' }
      ];
    }
  }

}
