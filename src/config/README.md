# Universal MCP Configuration Manager

A reusable configuration management system for Model Context Protocol (MCP) servers that provides platform-appropriate paths, standardized configuration handling, and environment variable support.

## Features

- **Platform-Appropriate Paths**: Automatically uses the correct configuration directories for Windows, macOS, and Linux
- **Global vs Local Configuration**: Support for both user-wide and project-specific configurations
- **Environment Variable Support**: Automatic .env file loading and environment variable mapping
- **Multi-Server Support**: Each MCP server gets its own isolated configuration space
- **Configurable Defaults**: Each server can define its own default configuration values
- **Pluggable Logging**: Custom logging functions can be provided

## Platform-Specific Paths

### Global Configuration Directories
- **Windows**: `%APPDATA%\[server-name]\` (e.g., `C:\Users\Username\AppData\Roaming\my-mcp-server\`)
- **macOS**: `~/Library/Application Support/[server-name]/`
- **Linux**: `~/.config/[server-name]/` (respects `XDG_CONFIG_HOME`)

### Local Configuration Directories
- **All Platforms**: `./.[server-name]/` (in the current working directory)

## File Structure

Each server gets the following files in both global and local directories:

```
[config-directory]/
├── config.json          # Non-sensitive configuration
└── .env                 # Sensitive data (passwords, tokens, secrets)
```

## Usage

### Basic Setup

```typescript
import { ConfigManager, ConfigManagerOptions } from './config/ConfigManager.js';

// Define your server's default configuration
const defaults = {
  'api.url': 'https://api.example.com',
  'api.timeout': 30000,
  'database.host': 'localhost',
  'database.port': 5432
};

// Create a ConfigManager instance for your server
const configManager = ConfigManager.getInstance({
  serverName: 'my-mcp-server',
  defaults: defaults,
  logger: {
    log: (message, data) => console.log(message, data),
    logError: (message, error) => console.error(message, error)
  }
});

// Initialize the configuration system
await configManager.initialize();
```

### Configuration Operations

```typescript
// Save non-sensitive configuration
await configManager.saveNonSecretToConfig('api.url', 'https://api.myservice.com', true); // global
await configManager.saveNonSecretToConfig('api.timeout', 60000, false); // local

// Save sensitive data to .env files
await configManager.saveSecretToEnv('API_KEY', 'secret-key-value', true); // global
await configManager.saveSecretToEnv('DATABASE_PASSWORD', 'db-password', false); // local

// Retrieve configuration values
const apiUrl = configManager.getConfigValue('api.url');
console.log(`API URL: ${apiUrl.value} (source: ${apiUrl.source})`);

// Get all configuration keys
const allKeys = configManager.getAllConfigKeys();
```

### Environment Variable Mapping

The ConfigManager automatically maps between environment variables and configuration keys:

- `API_KEY` ↔ `api.key`
- `DATABASE_PASSWORD` ↔ `database.password`
- `MY_SECRET_TOKEN` ↔ `my.secret.token`

Environment variables ending with `_PASSWORD`, `_SECRET`, or `_TOKEN` are automatically cached as configuration values.

## Configuration Priority

Configuration values are resolved in the following order (highest to lowest priority):

1. **Environment Variables** - Values from .env files or system environment
2. **Local Configuration** - Project-specific config.json
3. **Global Configuration** - User-wide config.json
4. **Defaults** - Server-defined default values

## Static Utility Methods

For servers that need to work with paths without creating a full ConfigManager instance:

```typescript
import { ConfigManager } from './config/ConfigManager.js';

// Get platform-appropriate global config directory
const globalDir = ConfigManager.getGlobalConfigDir();
// Windows: C:\Users\Username\AppData\Roaming
// macOS: /Users/username/Library/Application Support
// Linux: /home/username/.config

// Get local config directory for a specific server
const localDir = ConfigManager.getLocalConfigDir('my-server');
// All platforms: ./my-server/
```

## Example: PostgreSQL MCP Server

```typescript
import { ConfigManager } from './config/ConfigManager.js';

const postgresDefaults = {
  'postgres.host': 'localhost',
  'postgres.port': 5432,
  'postgres.database': 'postgres',
  'postgres.user': 'postgres',
  'postgres.password': '',
  'postgres.ssl': true,
  'postgres.connectionTimeout': 30000,
  'postgres.queryTimeout': 60000
};

const configManager = ConfigManager.getInstance({
  serverName: 'dj-postgres-mcp',
  defaults: postgresDefaults
});

await configManager.initialize();

// Configuration will be stored in:
// Global: C:\Users\Username\AppData\Roaming\dj-postgres-mcp\
// Local: ./dj-postgres-mcp/
```

## File Formats

### config.json
```json
{
  "api.url": "https://api.example.com",
  "api.timeout": 30000,
  "database.host": "localhost",
  "database.port": 5432
}
```

### .env
```bash
# API Configuration
API_KEY="your-secret-api-key"
API_TOKEN="your-auth-token"

# Database Configuration
DATABASE_PASSWORD="your-db-password"
```

## TypeScript Interfaces

```typescript
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
```

## Best Practices

1. **Server Naming**: Use descriptive, unique server names (e.g., `my-company-api-mcp`, `postgres-mcp`)
2. **Sensitive Data**: Always use `saveSecretToEnv()` for passwords, API keys, and tokens
3. **Global vs Local**: Use global for user preferences, local for project-specific settings
4. **Defaults**: Provide sensible defaults for all configuration values
5. **Initialization**: Always call `initialize()` before using configuration methods
6. **Error Handling**: Provide custom logger functions for proper error tracking

## Migration from Other Config Systems

If you're migrating from a different configuration system:

1. Define your configuration schema as defaults
2. Create a ConfigManager instance with your server name
3. Replace direct file operations with ConfigManager methods
4. Update environment variable names to follow the `KEY_NAME` convention
5. Test both global and local configuration scenarios

## Contributing

When extending the ConfigManager:

1. Maintain backward compatibility with existing servers
2. Add comprehensive tests for new features
3. Update this documentation
4. Consider cross-platform implications
5. Follow the existing code style and patterns
