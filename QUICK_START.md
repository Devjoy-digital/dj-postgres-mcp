# Quick Start Guide

## Installation

```bash
npm install -g dj-postgres-mcp
```

## Basic Setup

### 1. Configure Connection

```javascript
// In your AI assistant (Claude, etc.)
await use_mcp_tool('dj-postgres-mcp', 'configure_connection', {
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'mypassword',
  ssl: false
});
```

### 2. Test Connection

```javascript
await use_mcp_tool('dj-postgres-mcp', 'test_connection', {});
```

### 3. Start Using

```javascript
// List all tables
await use_mcp_tool('dj-postgres-mcp', 'list_tables', {});

// Execute a query
await use_mcp_tool('dj-postgres-mcp', 'execute_query', {
  query: 'SELECT * FROM users LIMIT 10'
});

// Describe a table
await use_mcp_tool('dj-postgres-mcp', 'describe_table', {
  table: 'users'
});
```

## Common Use Cases

### Create a Table

```javascript
await use_mcp_tool('dj-postgres-mcp', 'execute_query', {
  query: `
    CREATE TABLE todos (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      completed BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
});
```

### Insert Data Safely

```javascript
await use_mcp_tool('dj-postgres-mcp', 'execute_query', {
  query: 'INSERT INTO todos (title) VALUES ($1), ($2)',
  params: ['Buy groceries', 'Write documentation']
});
```

### Query with Parameters

```javascript
await use_mcp_tool('dj-postgres-mcp', 'execute_query', {
  query: 'SELECT * FROM todos WHERE completed = $1 ORDER BY created_at DESC',
  params: [false]
});
```

## Cloud Database Examples

### Azure Database for PostgreSQL

```javascript
await use_mcp_tool('dj-postgres-mcp', 'configure_connection', {
  host: 'myserver.postgres.database.azure.com',
  port: 5432,
  database: 'production',
  user: 'myadmin@myserver',
  password: 'SecurePass123!',
  ssl: true  // Required for Azure
});
```

### AWS RDS PostgreSQL

```javascript
await use_mcp_tool('dj-postgres-mcp', 'configure_connection', {
  host: 'mydb.123456789.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'MyRDSPassword',
  ssl: true  // Recommended for RDS
});
```

## Tips

1. **Always use parameters** for user input to prevent SQL injection
2. **Enable SSL** for cloud databases
3. **Check connection** before running critical queries
4. **Use transactions** for multi-step operations
5. **Review table structure** with `describe_table` before modifying

## Troubleshooting

### Connection Failed

1. Check your credentials with `get_connection_info`
2. Verify PostgreSQL is running and accessible
3. Check firewall rules for cloud databases
4. Ensure SSL is enabled for cloud providers

### Query Errors

1. Use `describe_table` to verify column names
2. Check SQL syntax matches PostgreSQL standards
3. Ensure parameters match query placeholders ($1, $2, etc.)

## Next Steps

- Read the [full documentation](./README.md)
- Explore the [API reference](./API.md)
- Learn about [testing](./TESTING.md)
- Check the [changelog](./CHANGELOG.md) for updates