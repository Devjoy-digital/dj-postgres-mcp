# PostgreSQL MCP Server

A Model Context Protocol (MCP) server for PostgreSQL database operations with centralized configuration management via dj-config-mcp.

## Features

- **Database Operations**: Execute SQL queries, describe tables, and list database schemas
- **Centralized Configuration**: All configuration managed by dj-config-mcp for consistency across MCP servers
- **Secure Password Storage**: Passwords automatically stored in `.env` files by dj-config-mcp
- **Comprehensive Testing**: Integration tests run against real PostgreSQL in Docker
- **Production Ready**: Handles parameterized queries, transactions, and complex data types
- **Cloud & Local Support**: Works with local PostgreSQL, Azure Database, AWS RDS, and more

## Installation

```bash
npm install -g dj-postgres-mcp
```

## Configuration

This server delegates all configuration management to [dj-config-mcp](https://github.com/devjoy-digital/dj-config-mcp), ensuring consistent configuration across all MCP servers in your environment.

### Initial Setup

1. Install dj-config-mcp if not already installed:
```bash
npm install -g dj-config-mcp
```

2. Configure your PostgreSQL connection using the MCP tools:

```javascript
// Configure the connection
await use_mcp_tool('dj-postgres-mcp', 'configure_connection', {
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'postgres',
  password: 'mypassword',
  ssl: true
});
```

The configuration is automatically managed by dj-config-mcp:
- Passwords are stored securely in `.env` files
- Non-sensitive settings are stored in configuration files
- All configuration can be distributed to MCP clients

### Environment Variables

You can also configure the server using environment variables

Set environment variables directly:

```bash
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DATABASE=mydb
export POSTGRES_USER=myuser
export POSTGRES_PASSWORD=mypassword
export POSTGRES_SSL=true
```

### Viewing Configuration

To check your current database configuration:

```javascript
// Get current connection settings
await use_mcp_tool('dj-postgres-mcp', 'get_connection_info', {});

// Test the connection
await use_mcp_tool('dj-postgres-mcp', 'test_connection', {});
```

## Available Tools

### Configuration Tools

- **configure_connection**: Configure database connection settings
- **get_connection_info**: Get current database connection configuration
- **test_connection**: Test the database connection with current settings

### Database Tools

- **execute_query**: Execute a SQL query against the PostgreSQL database
- **describe_table**: Get detailed information about a table structure
- **list_tables**: List all tables in the database or a specific schema


## Usage Examples

### Setting up the connection

```javascript
// Configure a local PostgreSQL connection
await use_mcp_tool('dj-postgres-mcp', 'configure_connection', {
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'mypassword',
  ssl: false
});

// Configure Azure Database for PostgreSQL
await use_mcp_tool('dj-postgres-mcp', 'configure_connection', {
  host: 'myserver.postgres.database.azure.com',
  port: 5432,
  database: 'myapp',
  user: 'myuser@myserver',
  password: 'mypassword',
  ssl: true  // Required for Azure
});
```

### Executing queries

```javascript
// Execute a simple query
await use_mcp_tool('dj-postgres-mcp', 'execute_query', {
  query: 'SELECT * FROM users LIMIT 10'
});

// Execute a parameterized query (prevents SQL injection)
await use_mcp_tool('dj-postgres-mcp', 'execute_query', {
  query: 'SELECT * FROM users WHERE age > $1 AND city = $2',
  params: [25, 'New York']
});

// Execute DDL statements
await use_mcp_tool('dj-postgres-mcp', 'execute_query', {
  query: `CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2),
    metadata JSONB
  )`
});

// Execute transactions
await use_mcp_tool('dj-postgres-mcp', 'execute_query', {
  query: `
    BEGIN;
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;
    UPDATE accounts SET balance = balance + 100 WHERE id = 2;
    COMMIT;
  `
});
```

### Getting table information

```javascript
// Describe a table structure
await use_mcp_tool('dj-postgres-mcp', 'describe_table', {
  table: 'users',
  schema: 'public'  // optional, defaults to 'public'
});

// List all tables in all schemas
await use_mcp_tool('dj-postgres-mcp', 'list_tables', {});

// List tables in a specific schema
await use_mcp_tool('dj-postgres-mcp', 'list_tables', {
  schema: 'public'
});
```

## Configuration Storage

The server stores configuration using dj-config-mcp with the following structure:

- `postgres.host`: Database host
- `postgres.port`: Database port  
- `postgres.database`: Database name
- `postgres.user`: Database username
- `postgres.password`: Database password (automatically stored in .env)
- `postgres.ssl`: Enable SSL connection

Sensitive data like passwords are automatically detected by dj-config-mcp and stored securely in environment variables.

## Architecture

This server follows a clean separation of concerns:

- **Configuration Management**: Fully delegated to dj-config-mcp
- **Database Operations**: Handled by QueryExecutor with comprehensive PostgreSQL type support
- **Error Handling**: Structured error responses with proper MCP error codes
- **Testing**: Integration tests validate all database operations

### No Direct Client Management

Unlike standalone MCP servers, dj-postgres-mcp does not manage client configurations directly. All client configuration is handled by dj-config-mcp, ensuring:

- Single source of truth for all MCP configurations
- Consistent configuration across multiple MCP servers
- Simplified deployment and maintenance

## Security Considerations

- **Passwords**: Always stored in environment variables (`.env` file)
- **SSL**: Enabled by default for secure connections
- **Configuration Files**: Non-sensitive settings stored via dj-config-mcp
- **Git Ignore**: Ensure `.env` and sensitive config files are in `.gitignore`

## Testing

The project includes comprehensive integration tests that run against a real PostgreSQL database in Docker.

### Running Tests

```bash
# Start PostgreSQL test container
npm run test:setup

# Run integration tests
npm run test:integration

# Run all tests
npm test

# Stop test container
npm run test:docker:down
```

See [TESTING.md](./TESTING.md) for detailed testing documentation.

## Development

```bash
# Clone the repository
git clone https://github.com/devjoy-digital/dj-postgres-mcp.git
cd dj-postgres-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Use MCP Inspector for testing
npm run inspector
```

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests to the main repository.

## Support

For issues and questions:
- GitHub Issues: https://github.com/devjoy-digital/dj-postgres-mcp/issues
- Documentation: https://github.com/devjoy-digital/dj-postgres-mcp#readme

## Buy Me a Coffee

If you find this MCP server useful, consider supporting its development:

[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://www.buymeacoffee.com/devjoydigital)

Your support helps maintain and improve this project!
