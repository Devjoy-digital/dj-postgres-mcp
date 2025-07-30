/**
 * ConfigManager.ts - Universal MCP configuration management system
 * 
 * A reusable configuration manager that any MCP server can use.
 * Provides platform-appropriate paths and standardized configuration handling.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { log, logError } from '../utils/logger.js';

interface ConfigValue {
  value: any;
  source: 'default' | 'local' | 'global' | 'env';
}

interface ConfigManagerOptions {
  serverName: string;
  defaults?: Record<string, any>;
  logger?: {
    log: (message: string, data?: any) => void;
    logError: (message: string, error: any) => void;
  };
}

/**
 * Universal configuration manager for MCP servers
 */
class ConfigManager {
  private static instances = new Map<string, ConfigManager>();
  private configCache = new Map<string, ConfigValue>();
  private globalConfigDir: string;
  private globalConfigFile: string;
  private localConfigDir: string;
  private localConfigFile: string;
  private globalEnvFile: string;
  private localEnvFile: string;
  private serverName: string;
  private defaults: Record<string, any>;
  private logger: {
    log: (message: string, data?: any) => void;
    logError: (message: string, error: any) => void;
  };

  private constructor(options: ConfigManagerOptions) {
    this.serverName = options.serverName;
    this.defaults = options.defaults || {};
    this.logger = options.logger || { log, logError };

    // Global configuration (platform-appropriate app data directory)
    const globalBaseDir = ConfigManager.getGlobalConfigDir();
    this.globalConfigDir = path.join(globalBaseDir, this.serverName);
    this.globalConfigFile = path.join(this.globalConfigDir, 'config.json');
    this.globalEnvFile = path.join(this.globalConfigDir, '.env');
    
    // Local configuration (project directory)
    this.localConfigDir = path.join(process.cwd(), `.${this.serverName}`);
    this.localConfigFile = path.join(this.localConfigDir, 'config.json');
    this.localEnvFile = path.join(this.localConfigDir, '.env');
  }

  /**
   * Get or create a ConfigManager instance for a specific server
   */
  static getInstance(options: ConfigManagerOptions): ConfigManager {
    if (!ConfigManager.instances.has(options.serverName)) {
      ConfigManager.instances.set(options.serverName, new ConfigManager(options));
    }
    return ConfigManager.instances.get(options.serverName)!;
  }

  /**
   * Get the appropriate global configuration directory for the platform
   * This is a static method so any MCP server can use it
   */
  static getGlobalConfigDir(): string {
    const platform = os.platform();
    
    switch (platform) {
      case 'win32':
        // Windows: Use AppData\Roaming
        return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      
      case 'darwin':
        // macOS: Use Library/Application Support
        return path.join(os.homedir(), 'Library', 'Application Support');
      
      default:
        // Linux and others: Use .config
        return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    }
  }

  /**
   * Get platform-appropriate local config directory for any server
   */
  static getLocalConfigDir(serverName: string): string {
    return path.join(process.cwd(), `.${serverName}`);
  }

  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureConfigDirs();
      await this.loadEnvFiles();
      await this.loadConfigFromFiles();
    } catch (error) {
      this.logger.logError('ConfigManager.initialize: Failed to initialize', error);
    }
  }

  /**
   * Ensure configuration directories exist
   */
  private async ensureConfigDirs(): Promise<void> {
    try {
      await fs.mkdir(this.globalConfigDir, { recursive: true });
      await fs.mkdir(this.localConfigDir, { recursive: true });
    } catch (error) {
      this.logger.logError('ConfigManager.ensureConfigDirs: Failed to create config directories', error);
    }
  }

  /**
   * Load environment files
   */
  private async loadEnvFiles(): Promise<void> {
    // Load global .env file
    try {
      const globalEnvData = await fs.readFile(this.globalEnvFile, 'utf-8');
      this.parseEnvFile(globalEnvData, 'global');
      this.logger.log('ConfigManager.loadEnvFiles: Global .env file loaded');
    } catch (error) {
      this.logger.log('ConfigManager.loadEnvFiles: No global .env file found');
    }

    // Load local .env file
    try {
      const localEnvData = await fs.readFile(this.localEnvFile, 'utf-8');
      this.parseEnvFile(localEnvData, 'local');
      this.logger.log('ConfigManager.loadEnvFiles: Local .env file loaded');
    } catch (error) {
      this.logger.log('ConfigManager.loadEnvFiles: No local .env file found');
    }
  }

  /**
   * Parse .env file content
   */
  private parseEnvFile(envData: string, source: 'global' | 'local'): void {
    const lines = envData.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
          process.env[key] = value;
          
          // Map common environment variables to config keys
          // This can be extended for different server types
          if (key.endsWith('_PASSWORD') || key.endsWith('_SECRET') || key.endsWith('_TOKEN')) {
            const configKey = key.toLowerCase().replace(/_/g, '.');
            this.configCache.set(configKey, { value, source: 'env' });
          }
        }
      }
    }
  }

  /**
   * Load configuration from files
   */
  private async loadConfigFromFiles(): Promise<void> {
    // Load global config
    try {
      const globalConfigData = await fs.readFile(this.globalConfigFile, 'utf-8');
      const globalConfig = JSON.parse(globalConfigData);
      
      for (const [key, value] of Object.entries(globalConfig)) {
        this.configCache.set(key, { value, source: 'global' });
      }
      
      this.logger.log('ConfigManager.loadConfigFromFiles: Global configuration loaded');
    } catch (error) {
      this.logger.log('ConfigManager.loadConfigFromFiles: No global config file found');
    }

    // Load local config (overrides global)
    try {
      const localConfigData = await fs.readFile(this.localConfigFile, 'utf-8');
      const localConfig = JSON.parse(localConfigData);
      
      for (const [key, value] of Object.entries(localConfig)) {
        this.configCache.set(key, { value, source: 'local' });
      }
      
      this.logger.log('ConfigManager.loadConfigFromFiles: Local configuration loaded');
    } catch (error) {
      this.logger.log('ConfigManager.loadConfigFromFiles: No local config file found');
    }
  }

  /**
   * Save configuration to appropriate file
   */
  private async saveConfigToFile(global: boolean): Promise<void> {
    try {
      const config: Record<string, any> = {};
      const targetSource = global ? 'global' : 'local';
      
      // Only save configs that match the target source
      for (const [key, configValue] of this.configCache.entries()) {
        if (configValue.source === targetSource) {
          config[key] = configValue.value;
        }
      }
      
      const configFile = global ? this.globalConfigFile : this.localConfigFile;
      await fs.writeFile(configFile, JSON.stringify(config, null, 2));
      this.logger.log(`ConfigManager.saveConfigToFile: Configuration saved to ${global ? 'global' : 'local'} file`);
    } catch (error) {
      this.logger.logError('ConfigManager.saveConfigToFile: Failed to save config', error);
    }
  }

  /**
   * Save environment variables to .env file
   */
  private async saveEnvToFile(global: boolean, envVars: Record<string, string>): Promise<void> {
    try {
      const envFile = global ? this.globalEnvFile : this.localEnvFile;
      const envContent = Object.entries(envVars)
        .map(([key, value]) => `${key}="${value}"`)
        .join('\n');
      
      await fs.writeFile(envFile, envContent);
      this.logger.log(`ConfigManager.saveEnvToFile: Environment variables saved to ${global ? 'global' : 'local'} .env file`);
    } catch (error) {
      this.logger.logError('ConfigManager.saveEnvToFile: Failed to save .env file', error);
    }
  }

  /**
   * Check if a key is sensitive (should be stored in environment)
   */
  isSensitiveKey(key: string): boolean {
    return key.toLowerCase().includes('password') || 
           key.toLowerCase().includes('secret') ||
           key.toLowerCase().includes('token');
  }

  /**
   * Save a secret to environment variable and .env file
   */
  async saveSecretToEnv(key: string, value: string, global: boolean = false): Promise<void> {
    this.logger.log(`ConfigManager.saveSecretToEnv: Saving secret ${key} to environment (global: ${global})`);
    
    // Set in current process environment
    process.env[key] = value;
    
    // Save to .env file
    await this.saveEnvToFile(global, { [key]: value });
    
    // Cache it for this session with appropriate config key mapping
    const configKey = key.toLowerCase().replace(/_/g, '.');
    this.configCache.set(configKey, { value, source: 'env' });
  }

  /**
   * Get a configuration value
   */
  getConfigValue(key: string): ConfigValue {
    this.logger.log(`ConfigManager.getConfigValue: Getting config value for ${key}`);
    
    // Check cache first (includes loaded configs and env vars)
    if (this.configCache.has(key)) {
      return this.configCache.get(key)!;
    }
    
    // Check environment variables
    const envKey = key.toUpperCase().replace(/\./g, '_');
    const envValue = process.env[envKey];
    if (envValue) {
      const configValue = { value: envValue, source: 'env' as const };
      this.configCache.set(key, configValue);
      return configValue;
    }
    
    // Return from defaults if available
    if (key in this.defaults) {
      return { value: this.defaults[key], source: 'default' };
    }
    
    return { value: undefined, source: 'default' };
  }

  /**
   * Save a non-secret configuration value
   */
  async saveNonSecretToConfig(key: string, value: any, global: boolean = false): Promise<void> {
    this.logger.log(`ConfigManager.saveNonSecretToConfig: Saving non-secret ${key} = ${value} (global: ${global})`);
    
    this.configCache.set(key, { 
      value, 
      source: global ? 'global' : 'local' 
    });
    
    // Always save to file (both global and local)
    await this.saveConfigToFile(global);
  }

  /**
   * Get all configuration keys
   */
  getAllConfigKeys(): string[] {
    this.logger.log('ConfigManager.getAllConfigKeys: Getting all config keys');
    
    const keys = new Set<string>();
    
    // Add cached keys
    for (const key of this.configCache.keys()) {
      keys.add(key);
    }
    
    // Add default keys
    for (const key of Object.keys(this.defaults)) {
      keys.add(key);
    }
    
    return Array.from(keys);
  }
}

// Create a default instance for the postgres server
const postgresDefaults = {
  'postgres.host': 'localhost',
  'postgres.port': 5432,
  'postgres.database': 'postgres',
  'postgres.user': 'postgres',
  'postgres.password': '',
  'postgres.ssl': true,
  'postgres.connectionTimeout': 30000,
  'postgres.queryTimeout': 60000,
  'postgres.maxConnections': 10,
  'postgres.autoRetry': true
};

const configManager = ConfigManager.getInstance({
  serverName: 'dj-postgres-mcp',
  defaults: postgresDefaults,
  logger: { log, logError }
});

// Export functions that match the original dj-config-mcp interface
export function isSensitiveKey(key: string): boolean {
  return configManager.isSensitiveKey(key);
}

export async function saveSecretToEnv(key: string, value: string, global: boolean = false): Promise<void> {
  await configManager.saveSecretToEnv(key, value, global);
}

export function getConfigValue(key: string): ConfigValue {
  return configManager.getConfigValue(key);
}

export async function saveNonSecretToConfig(key: string, value: any, global: boolean = false): Promise<void> {
  await configManager.saveNonSecretToConfig(key, value, global);
}

export function getAllConfigKeys(): string[] {
  return configManager.getAllConfigKeys();
}

// Remove client distribution functionality as requested
export function distributeConfigToClients(clients: string[]): void {
  log(`ConfigManager.distributeConfigToClients: Client distribution removed - ignoring clients: ${clients.join(', ')}`);
}

// Initialize the config manager
export async function initializeConfigManager(): Promise<void> {
  await configManager.initialize();
}

// Export the ConfigManager class and static methods for other MCP servers to use
export { ConfigManager, ConfigManagerOptions, ConfigValue };
