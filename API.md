# dj-postgres-mcp API Documentation

## Overview

The dj-postgres-mcp server provides MCP (Model Context Protocol) tools for PostgreSQL database operations. All configuration is managed through dj-config-mcp for consistency across MCP servers.

## Tools

### Configuration Tools

#### `configure_connection`

Configure PostgreSQL database connection settings.

**Parameters:**
- `host` (string, required): Database host (e.g., localhost or cloud hostname)
- `port` (number, optional): Database port (default: 5432)
- `database` (string, required): Database name
- `user` (string, required): Database username
- `password` (string, required): Database password
- `ssl` (boolean, optional): Enable SSL connection (default: true, required for cloud databases)

**Returns:**
- Success message with connection test result
- Configuration saved via dj-config-mcp

**Example:**
```javascript
{
  "host": "myserver.postgres.database.azure.com",
  "port": 5432,
  "database": "production",
  "user": "dbadmin@myserver",
  "password": "SecurePass123!",
  "ssl": true
}
```

#### `get_connection_info`

Get current database connection configuration.

**Parameters:** None

**Returns:**
- Current configuration including host, port, database, user, ssl status
- Password presence indicator (not the actual password)

**Example Response:**
```json
{
  "host": "localhost",
  "port": 5432,
  "database": "test_db",
  "user": "postgres",
  "ssl": false,
  "password_configured": true
}
```

#### `test_connection`

Test the current database connection.

**Parameters:** None

**Returns:**
- Connection status (success/failure)
- PostgreSQL server version if successful
- Connection latency in milliseconds
- Error message if connection fails

**Example Response (Success):**
```
✅ Connection Test Successful!

Connection Details:
- Host: localhost:5432
- Database: test_db
- User: postgres
- SSL: disabled
- Server Version: PostgreSQL 14.18 on x86_64-pc-linux-musl...
- Connection Latency: 45ms
```

### Database Operation Tools

#### `execute_query`

Execute a SQL query against the configured PostgreSQL database.

**Parameters:**
- `query` (string, required): SQL query to execute
- `params` (array, optional): Query parameters for parameterized queries

**Returns:**
- Query results with rows and metadata
- Execution time
- Row count
- Error details if query fails

**Supported Operations:**
- SELECT queries with results
- INSERT/UPDATE/DELETE with affected row counts
- DDL statements (CREATE, ALTER, DROP)
- Multi-statement transactions
- Parameterized queries for security

**Example 1: Simple SELECT**
```javascript
{
  "query": "SELECT id, name, email FROM users LIMIT 5"
}
```

**Example 2: Parameterized Query**
```javascript
{
  "query": "SELECT * FROM orders WHERE user_id = $1 AND status = $2",
  "params": [123, "pending"]
}
```

**Example 3: Transaction**
```javascript
{
  "query": "BEGIN; UPDATE inventory SET quantity = quantity - $1 WHERE id = $2; INSERT INTO order_items (order_id, product_id, quantity) VALUES ($3, $2, $1); COMMIT;",
  "params": [5, 42, 1001]
}
```

#### `list_tables`

List all tables in the configured PostgreSQL database or a specific schema.

**Parameters:**
- `schema` (string, optional): Schema name to filter by (lists all schemas if not provided)

**Returns:**
- List of tables with schema name, table name, row count estimate, and size
- Grouped by schema for easy navigation

**Example:**
```javascript
// List all tables
{}

// List tables in public schema only
{
  "schema": "public"
}
```

**Example Response:**
```
📊 Tables in PostgreSQL Database

Schema: public
├── users (1,234 rows, 156 KB)
├── orders (5,678 rows, 892 KB)
└── products (345 rows, 234 KB)

Schema: audit
├── user_logs (12,345 rows, 2.1 MB)
└── system_events (45,678 rows, 5.4 MB)
```

#### `describe_table`

Get detailed information about a table structure in the configured PostgreSQL database.

**Parameters:**
- `table` (string, required): Table name
- `schema` (string, optional): Schema name (default: "public")

**Returns:**
- Column information: name, type, nullable, default, constraints
- Primary key information
- Foreign key relationships
- Indexes and their definitions
- Check constraints

**Example:**
```javascript
{
  "table": "users",
  "schema": "public"
}
```

**Example Response:**
```
📋 Table Structure: public.users

Columns:
┌────────────┬──────────────────┬──────────┬─────────┬────────────────────────┐
│ Column     │ Type             │ Nullable │ Default │ Constraints            │
├────────────┼──────────────────┼──────────┼─────────┼────────────────────────┤
│ id         │ integer          │ NO       │ serial  │ PRIMARY KEY            │
│ email      │ character varying│ NO       │         │ UNIQUE                 │
│ name       │ character varying│ NO       │         │                        │
│ created_at │ timestamp        │ NO       │ now()   │                        │
│ is_active  │ boolean          │ YES      │ true    │                        │
│ metadata   │ jsonb            │ YES      │         │                        │
└────────────┴──────────────────┴──────────┴─────────┴────────────────────────┘

Indexes:
- users_pkey (PRIMARY KEY on id)
- users_email_key (UNIQUE on email)
- idx_users_created_at (BTREE on created_at)
```

## Data Type Support

The server supports all common PostgreSQL data types including:

### Numeric Types
- `smallint`, `integer`, `bigint`
- `decimal`, `numeric`, `real`, `double precision`
- `smallserial`, `serial`, `bigserial`

### Character Types
- `character varying`, `varchar`, `character`, `char`, `text`
- `citext` (case-insensitive text)

### Date/Time Types
- `timestamp`, `timestamp with time zone`, `timestamp without time zone`
- `date`, `time`, `time with time zone`, `time without time zone`
- `interval`

### Boolean Type
- `boolean`

### Binary Types
- `bytea`

### JSON Types
- `json`, `jsonb`

### UUID Type
- `uuid`

### Network Types
- `inet`, `cidr`, `macaddr`, `macaddr8`

### Geometric Types
- `point`, `line`, `lseg`, `box`, `path`, `polygon`, `circle`

### Text Search Types
- `tsvector`, `tsquery`

### Special Types
- `xml`, `money`, `oid`, `regproc`, `regtype`
- Array types (e.g., `integer[]`, `text[]`)
- Custom enum types

## Error Handling

All tools return structured error responses following MCP protocol:

### Error Codes
- `-32602`: Invalid parameters
- `-32603`: Internal error (includes PostgreSQL errors)

### Error Response Format
```json
{
  "error": {
    "code": -32602,
    "message": "Invalid parameters: host, database, user, and password are required"
  }
}
```

## Security Considerations

1. **Parameterized Queries**: Always use parameters for user input to prevent SQL injection
2. **Password Storage**: Passwords are automatically stored in `.env` files by dj-config-mcp
3. **SSL Connections**: Enabled by default, required for cloud databases
4. **Connection Validation**: All connections are validated before executing queries

## Configuration Storage

Configuration is stored by dj-config-mcp with the following keys:
- `postgres.host`: Database host
- `postgres.port`: Database port
- `postgres.database`: Database name
- `postgres.user`: Database username
- `postgres.password`: Database password (in .env)
- `postgres.ssl`: SSL enabled status

## Integration with MCP Clients

This server integrates with MCP clients through the standard MCP protocol. Configuration distribution to clients (VS Code, Claude Desktop, Claude Code, Cursor) is handled entirely by dj-config-mcp.