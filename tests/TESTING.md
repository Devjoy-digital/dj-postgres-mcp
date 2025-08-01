# Testing Guide for dj-postgres-mcp

## Overview

The dj-postgres-mcp project includes comprehensive integration tests that verify database operations against a real PostgreSQL instance running in Docker.

## Test Infrastructure

### Docker PostgreSQL Container

The test suite uses Docker to run a PostgreSQL 14 Alpine container with the following configuration:

- **Container Name**: dj-postgres-mcp-test
- **Port**: 5432
- **Database**: test_db
- **Username**: postgres
- **Password**: postgres
- **SSL**: Disabled for local testing

### Test Philosophy: Real Database Only

This project uses **real PostgreSQL database testing exclusively** - no mocks or stubs. All tests run against the actual Docker PostgreSQL instance to ensure:

- **Real-world accuracy**: Tests validate actual database behavior
- **Integration confidence**: All components work together correctly  
- **Performance verification**: Real query execution times and behavior
- **Schema validation**: Actual PostgreSQL constraints and types

### Test Runner

We use a custom Node.js test runner (`run-integration-tests.js`) that:

1. Creates necessary `.env` file with database password
2. Starts the MCP server
3. Sends MCP protocol requests to test all database operations
4. Validates responses and tracks test results
5. Provides colored output and detailed test summaries

## Running Tests

### Quick Start

```bash
# Start Docker PostgreSQL container
npm run test:setup

# Run all tests (comprehensive database tests)
npm test

# Run integration tests (same as npm test)
npm run test:integration

# Stop Docker container
npm run test:docker:down
```

### Individual Test Commands

```bash
# Start Docker PostgreSQL manually
npm run test:docker:up

# Run comprehensive database tests
npm run test:integration

# Run basic Jest tests (errors and smoke tests only)
npm run test:basic

# Clean up Docker resources
npm run test:docker:down
```

## Integration Tests

The integration test suite verifies:

1. **Connection Management**
   - Configure database connection
   - Test connection with health check
   - Retrieve connection configuration

2. **DDL Operations**
   - CREATE TABLE with various column types
   - DROP TABLE with CASCADE

3. **DML Operations**
   - INSERT with parameterized queries
   - SELECT with ORDER BY
   - UPDATE with WHERE clause
   - Multi-statement transactions

4. **Schema Operations**
   - List all tables
   - Describe table structure with columns, types, and constraints

## Test Results

A successful test run shows:

```
🧪 PostgreSQL Integration Test Runner

✅ Created .env file with password

Running 10 database integration tests...

✅ Configure PostgreSQL connection
✅ Test connection
   PostgreSQL: PostgreSQL 14.18 on x86_64-pc-linux-musl...
✅ CREATE TABLE
   Table created successfully
✅ INSERT with parameters
   Inserted 2 rows
✅ SELECT query
   Returned 2 rows
✅ List tables
   Found integration_test_users table
✅ Describe table
✅ UPDATE query
✅ Transaction test
✅ Cleanup - DROP TABLE

==================================================
📊 Test Summary:
   Passed: 10
   Failed: 0
   Total:  10
==================================================
```

## CI/CD Integration

GitHub Actions automatically:

1. Starts PostgreSQL service container
2. Builds the project
3. Runs unit tests (with continue-on-error)
4. Runs integration tests
5. Publishes to npm on version changes

## Troubleshooting

### Docker Not Running

```bash
# Check Docker status
docker version

# Start Docker Desktop on Windows/Mac
# Or start Docker service on Linux
sudo systemctl start docker
```

### Port Conflicts

If port 5432 is already in use:

```bash
# Find process using port
netstat -ano | findstr :5432  # Windows
lsof -i :5432                  # Mac/Linux

# Stop conflicting service or use different port
```

### Password Authentication Failed

Ensure the `.env` file exists:

```bash
# Check if .env file exists
cat devjoy-digital/dj-postgres-mcp/.env

# Should contain:
# POSTGRES_PASSWORD=postgres
```

### Manual Database Testing

Connect to the test database manually:

```bash
# Using Docker exec
docker exec -it dj-postgres-mcp-test psql -U postgres -d test_db

# Using psql client
psql -h localhost -p 5432 -U postgres -d test_db
```

## Development Tips

1. **Watch Mode**: Use `npm run dev` to rebuild on changes
2. **Debug Output**: Check server stderr for detailed error logs
3. **Manual Testing**: Use `test-database-operations.js` for specific scenarios
4. **MCP Inspector**: Use `npm run inspector` for interactive testing

## Known Issues

1. **Jest/ESM Compatibility**: Unit tests using @modelcontextprotocol/sdk fail due to ESM import issues
2. **Windows Path Handling**: Ensure proper escaping in file paths
3. **Container Startup Time**: First run may take longer due to Docker image download