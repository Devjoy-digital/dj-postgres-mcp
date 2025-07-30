# PostgreSQL MCP Server

A Model Context Protocol (MCP) server for PostgreSQL database operations with flexible configuration management using the @devjoy-digital/mcp-config system.

## Features

- **Database Operations**: Execute SQL queries, describe tables, and list database schemas
- **Flexible Configuration**: Uses the shared @devjoy-digital/mcp-config system for consistent configuration management
- **Multiple Connection Methods**: Support for local and cloud PostgreSQL instances
- **Security**: Sensitive data (passwords) stored in environment variables
- **Client Integration**: Automatic configuration distribution to supported AI clients

## Installation

```bash
npm install -g @devjoy-digital/postgres-server-mcp
```

## Configuration

This server uses the @devjoy-digital/mcp-config system for configuration management. You have several options:

### Option 1: Interactive Setup (Recommended)

Use the `config_connection_interactive` tool to run the interactive configuration process:

```bash
# This will guide you through setting up all configuration options
# including database connection details and client selection
```

### Option 2: Manual Configuration

You can configure the server using individual tools:

1. **config_connection**: Set up database connection parameters
2. **update_configuration**: Update specific configuration values
3. **get_connection_info**: View current configuration

### Option 3: Environment Variables

Set environment variables directly:

```bash
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DATABASE=mydb
export POSTGRES_USER=myuser
export POSTGRES_PASSWORD=mypassword
export POSTGRES_SSL=true
```

### Option 4: Configuration File

Create a `config/default.json` file:

```json
{
  "postgres": {
    "host": "localhost",
    "port": 5432,
    "database": "mydb",
    "user": "myuser",
    "ssl": true,
    "connectionTimeout": 30000,
    "queryTimeout": 60000,
    "maxConnections": 10,
    "autoRetry": true
  }
}
```

**Note**: Sensitive data like passwords should be stored in environment variables, not in configuration files.

## Available Tools

### Configuration Tools

- **config_connection**: Configure database connection settings using mcp-config system
- **get_connection_info**: Get current database connection configuration
- **config_connection_interactive**: Run the interactive mcp-config setup process
- **update_configuration**: Update specific configuration settings using mcp-config
- **test_connection**: Test the database connection with current settings

### Database Tools

- **execute_query**: Execute a SQL query against the PostgreSQL database
- **describe_table**: Get detailed information about a table structure
- **list_tables**: List all tables in the database or a specific schema

## Available Resources

- **postgres://database/overview**: Overview of database schemas and tables
- **postgres://schema/{schema_name}**: Tables and views in a specific schema

## Usage Examples

### Setting up the connection

```javascript
// Use the interactive setup
await callTool('config_connection_interactive', {});

// Or configure manually
await callTool('config_connection', {
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'mypassword',
  ssl: true
});
```

### Executing queries

```javascript
// Execute a simple query
await callTool('execute_query', {
  query: 'SELECT * FROM users LIMIT 10'
});

// Execute a parameterized query
await callTool('execute_query', {
  query: 'SELECT * FROM users WHERE age > $1',
  params: [25]
});
```

### Getting table information

```javascript
// Describe a table structure
await callTool('describe_table', {
  schema: 'public',
  table: 'users'
});

// List all tables
await callTool('list_tables', {});

// List tables in a specific schema
await callTool('list_tables', {
  schema: 'public'
});
```

## Configuration Schema

The server uses a structured configuration schema defined in `template-config.json`:

```json
{
  "postgres": {
    "properties": {
      "host": { "doc": "Database host", "default": "localhost" },
      "port": { "doc": "Database port", "default": 5432 },
      "database": { "doc": "Database name", "default": "postgres" },
      "user": { "doc": "Database username", "default": "postgres" },
      "password": { "doc": "Database password", "sensitive": true },
      "ssl": { "doc": "Enable SSL connection", "default": true },
      "connectionTimeout": { "doc": "Connection timeout in ms", "default": 30000 },
      "queryTimeout": { "doc": "Query timeout in ms", "default": 60000 },
      "maxConnections": { "doc": "Max concurrent connections", "default": 10 },
      "autoRetry": { "doc": "Auto retry failed connections", "default": true }
    }
  }
}
```

## Client Integration

The mcp-config system automatically distributes configuration to supported AI clients:

- VS Code
- Claude Desktop
- Claude Code
- Cursor

Configuration files are created in the appropriate directories for each client.

## Security Considerations

- **Passwords**: Always stored in environment variables (`.env` file)
- **SSL**: Enabled by default for secure connections
- **Configuration Files**: Non-sensitive settings stored in `config/default.json`
- **Git Ignore**: Ensure `.env` and sensitive config files are in `.gitignore`

## Development

```bash
# Clone the repository
git clone https://github.com/devjoy-digital/postgres-mcp-server.git
cd postgres-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests to the main repository.

## Support

For issues and questions:
- GitHub Issues: https://github.com/devjoy-digital/postgres-mcp-server/issues
- Documentation: https://github.com/devjoy-digital/postgres-mcp-server#readme
