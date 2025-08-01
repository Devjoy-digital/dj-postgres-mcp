# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.1] - 2025-08-01

### Added
- **Comprehensive Testing Suite**: Integration tests that run against real PostgreSQL in Docker
- **Custom Test Runner**: Node.js-based integration test runner to bypass Jest/ESM compatibility issues
- **Docker Test Environment**: PostgreSQL 14 Alpine container for consistent testing
- **GitHub Actions CI/CD**: Automated testing and npm publishing on version changes
- **Test Documentation**: Detailed TESTING.md guide for running and understanding tests

### Fixed
- **Configuration Value Extraction**: Fixed bug where dj-config-mcp returns objects instead of raw values
- **Password Storage**: Ensures passwords are properly stored in .env files by dj-config-mcp
- **Error Messages**: Improved error handling to show actual error messages instead of empty strings

### Changed
- **Architecture Refactoring**: Complete removal of path management and client configuration code
- **Configuration Delegation**: All configuration now fully managed by dj-config-mcp
- **Removed Dead Code**: Eliminated ConnectionManager, SessionManager, and related features
- **Improved Type Support**: Expanded PostgreSQL data type mappings from 13 to 40+ types

### Technical
- Fixed fragile primary key detection in describeTable method
- Added proper value extraction from dj-config-mcp response objects
- Updated npm scripts for better test execution flow
- Added Docker management commands for test environment

## [0.9.0] - 2025-01-31

### Changed
- **Package Name**: Changed from scoped package `@devjoy-digital/dj-postgres-mcp` to unqualified package `dj-postgres-mcp`
- **Publishing**: Package is now published as an unqualified npm package for easier installation
- **Installation**: Updated installation command to `npm install -g dj-postgres-mcp`

### Migration
- Uninstall the old scoped package: `npm uninstall -g @devjoy-digital/dj-postgres-mcp`
- Install the new unqualified package: `npm install -g dj-postgres-mcp`
- All functionality remains the same, only the package name has changed

## [1.0.0] - 2025-01-28

### Added
- **Major Version Release**: Full integration with mcp-config 1.3.0
- **New Tool**: `config_secrets` - Configure only missing sensitive values securely
- **New Tool**: `configure_clients` - Configure which client applications receive server configuration
- **New Tool**: `get_supported_clients` - List supported client applications for configuration distribution
- **Enhanced Security**: Automatic detection and secure storage of sensitive configuration values in .env files
- **Client Distribution System**: Automatic configuration distribution to VS Code, Claude Code, Claude Desktop, and Cursor
- **Global Configuration Protection**: Prevents accidental modification of global configurations
- **Cross-Platform Support**: Windows, macOS, and Linux client configuration paths

### Enhanced
- **`update_configuration` tool**: Added `allowGlobalOverride` parameter for global configuration protection
- **Error Handling**: Improved TypeScript error handling and more informative error messages
- **User Experience**: Better tool descriptions and helpful tips for common configuration issues

### Changed
- **Dependency Update**: Updated `@devjoy-digital/mcp-config` from ^1.1.0 to ^1.3.0
- **Version**: Bumped to 1.0.0 to reflect major feature additions and stability

### Technical
- Added 4 new handler methods to McpConfigHandler
- Enhanced configuration schema support
- Maintained full backward compatibility
- Improved build process and TypeScript compilation

## [0.9.9] - 2025-07-28

### Added
- **Smart Configuration Detection**: Enhanced mcp-config system now automatically detects missing sensitive values
- **Targeted Password Prompting**: Interactive setup now specifically prompts for missing passwords with security messaging
- **Fallback Configuration**: Improved error handling with fallback from targeted to full configuration setup

### Changed
- **Enhanced User Experience**: Configuration process now intelligently handles missing sensitive data
- **Better Error Messages**: More helpful error messages when npx is not available
- **Improved Security Messaging**: Clear communication about secure storage of sensitive values

### Technical
- **Updated mcp-config**: Now uses @devjoy-digital/mcp-config v1.1.0 with enhanced capabilities
- **New config-secrets Command**: Added targeted command for handling missing sensitive values only

## [0.9.8] - 2025-07-28

### Changed
- **Tool Names**: Renamed configuration tools for better consistency and clarity
  - `setup_mcp_config` → `config_connection_interactive`
  - `configure_connection` → `config_connection`
- **Documentation**: Updated all documentation to reflect new tool names

### Improved
- **User Experience**: More intuitive and consistent tool naming convention
- **API Clarity**: Tool names now clearly indicate their purpose and interaction style

## [0.9.7] - 2025-07-28

### Added
- **MCP Config Integration**: Migrated to use @devjoy-digital/mcp-config system for unified configuration management
- **Interactive Setup**: New `config_connection_interactive` tool for guided configuration process
- **Client Distribution**: Automatic configuration distribution to supported AI clients (VS Code, Claude Desktop, Cursor)
- **Environment Variable Support**: Enhanced environment variable handling with POSTGRES_* prefixed variables
- **Configuration Schema**: Structured configuration schema in `template-config.json`

### Changed
- **Configuration System**: Replaced custom ConfigHandler with McpConfigHandler using mcp-config
- **Tool Interface**: Updated configuration tools to use mcp-config system
- **Documentation**: Comprehensive README update with new configuration options
- **Security**: Improved separation of sensitive and non-sensitive configuration data

### Features
- **Unified Config Management**: Consistent configuration across all @devjoy-digital MCP servers
- **Multi-Client Support**: Automatic configuration sharing with supported AI clients
- **Interactive Configuration**: Step-by-step configuration setup process
- **Environment Integration**: Seamless environment variable and config file integration
- **Schema Validation**: Structured configuration with validation and documentation

### Breaking Changes
- **Removed Legacy Configuration**: Old `.db-config.json` files are no longer supported
- **Environment Variables**: Now use POSTGRES_* prefix (e.g., POSTGRES_HOST, POSTGRES_PASSWORD)
- **Configuration Tools**: Removed `create_config_file` tool in favor of mcp-config system

### Migration Guide
- Use `config_connection_interactive` tool for interactive configuration setup
- Convert environment variables to POSTGRES_* prefix format
- Replace old configuration files with mcp-config system

## [0.9.1] - 2025-07-26

### Added
- Flexible configuration system with automatic discovery
- Support for project-specific configuration files
- Configuration file search in standard development directories (.mcp-servers, .claude, .cursor, .vscode)
- `create_config_file` tool for easy configuration setup
- `configure_connection` tool for session-based configuration
- `set_password` tool for secure password management
- `get_connection_info` tool for viewing current configuration
- `test_connection` tool for database connectivity testing
- Comprehensive PostgreSQL database operations
- Support for parameterized queries
- SSL connection support for cloud databases
- Automatic path validation and security measures

### Features
- **Database Operations**: Execute SQL queries, describe tables, list schemas
- **Connection Management**: Test connections and configure database settings
- **Security**: Parameterized queries and connection validation
- **Multi-Environment Support**: Works with Claude Desktop, VS Code, and other MCP clients
- **Cloud Database Support**: Compatible with Azure, AWS RDS, and other cloud PostgreSQL instances

### Configuration
- Automatic configuration discovery in project directories
- Environment variable fallback support
- Session-based configuration management
- Secure credential handling
