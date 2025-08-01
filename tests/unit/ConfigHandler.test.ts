import { ConfigHandler } from '../../src/handlers/ConfigHandler.js';

// Real database integration test for ConfigHandler
// Requires Docker PostgreSQL to be running on localhost:5432

const TEST_DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'test_db',
  user: 'postgres',
  password: 'postgres',
  ssl: false
};

describe('ConfigHandler - Real Database Integration', () => {
  let configHandler: ConfigHandler;

  beforeAll(() => {
    // Ensure we're testing against the Docker PostgreSQL
    if (!process.env.CI) {
      console.log('Running ConfigHandler tests against Docker PostgreSQL at localhost:5432');
    }
  });

  beforeEach(() => {
    configHandler = new ConfigHandler();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const config = configHandler.getConfig();
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('postgres');
      expect(config.user).toBe('postgres');
      expect(config.ssl).toBe(false);
    });

    it('should load configuration from environment variables', () => {
      const originalEnv = { ...process.env };
      
      process.env.POSTGRES_HOST = 'test-host';
      process.env.POSTGRES_PORT = '5433';
      process.env.POSTGRES_DATABASE = 'testdb';
      process.env.POSTGRES_USER = 'testuser';
      process.env.POSTGRES_PASSWORD = 'testpass';
      process.env.POSTGRES_SSL = 'true';

      const handler = new ConfigHandler();
      const config = handler.getConfig();

      expect(config.host).toBe('test-host');
      expect(config.port).toBe(5433);
      expect(config.database).toBe('testdb');
      expect(config.user).toBe('testuser');
      expect(config.password).toBe('testpass');
      expect(config.ssl).toBe(true);

      // Restore original environment
      process.env = originalEnv;
    });
  });

  describe('configuration tools', () => {
    it('should handle configure_connection tool', async () => {
      const result = await configHandler.handleToolCall('configure_connection', TEST_DB_CONFIG);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('🔧 PostgreSQL Configuration');
      expect(result.content[0].text).toContain('localhost:5432');
      expect(result.content[0].text).toContain('test_db');
      expect(result.content[0].text).toContain('postgres');
    });

    it('should validate required parameters for configure_connection', async () => {
      await expect(
        configHandler.handleToolCall('configure_connection', {
          host: 'localhost'
          // Missing required fields
        })
      ).rejects.toThrow('host, database, user, and password are required');
    });

    it('should handle get_connection_info tool', async () => {
      // First configure the connection
      await configHandler.handleToolCall('configure_connection', TEST_DB_CONFIG);

      // Then get the info
      const result = await configHandler.handleToolCall('get_connection_info', {});

      expect(result.content[0].text).toContain('📋 Current PostgreSQL Configuration');
      expect(result.content[0].text).toContain('"host": "localhost"');
      expect(result.content[0].text).toContain('"port": 5432');
      expect(result.content[0].text).toContain('"database": "test_db"');
      expect(result.content[0].text).toContain('"passwordConfigured": true');
    });

    it('should handle test_connection tool with real database', async () => {
      // Configure connection to Docker PostgreSQL
      await configHandler.handleToolCall('configure_connection', TEST_DB_CONFIG);

      // Test the connection
      const result = await configHandler.handleToolCall('test_connection', {});

      expect(result.content[0].text).toContain('✅ Connection successful');
      expect(result.content[0].text).toContain('PostgreSQL 14');
      expect(result.content[0].text).toContain('Connection Latency:');
    });

    it('should handle test_connection tool with invalid database', async () => {
      // Configure connection with wrong password
      const badConfig = { ...TEST_DB_CONFIG, password: 'wrongpassword' };
      await configHandler.handleToolCall('configure_connection', badConfig);

      // Test the connection - should fail
      const result = await configHandler.handleToolCall('test_connection', {});

      expect(result.content[0].text).toContain('❌ Connection Test Failed');
      expect(result.content[0].text).toContain('password authentication failed');
    });

    it('should throw error for unknown tool', async () => {
      await expect(
        configHandler.handleToolCall('unknown_tool', {})
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('isConfigured', () => {
    it('should return false for default configuration', () => {
      expect(configHandler.isConfigured()).toBe(false);
    });

    it('should return true after valid configuration', async () => {
      await configHandler.handleToolCall('configure_connection', TEST_DB_CONFIG);
      expect(configHandler.isConfigured()).toBe(true);
    });
  });

  describe('getTools', () => {
    it('should return all configuration tools', () => {
      const tools = configHandler.getTools();
      
      expect(tools).toHaveLength(3);
      expect(tools.find(t => t.name === 'configure_connection')).toBeDefined();
      expect(tools.find(t => t.name === 'get_connection_info')).toBeDefined();
      expect(tools.find(t => t.name === 'test_connection')).toBeDefined();
    });

    it('should have proper tool schemas', () => {
      const tools = configHandler.getTools();
      const configTool = tools.find(t => t.name === 'configure_connection');
      
      expect(configTool?.inputSchema.properties?.host).toBeDefined();
      expect(configTool?.inputSchema.properties?.port).toBeDefined();
      expect(configTool?.inputSchema.properties?.database).toBeDefined();
      expect(configTool?.inputSchema.properties?.user).toBeDefined();
      expect(configTool?.inputSchema.properties?.password).toBeDefined();
      expect(configTool?.inputSchema.properties?.ssl).toBeDefined();
      expect(configTool?.inputSchema.required).toEqual(['host', 'database', 'user', 'password']);
    });
  });
});
