# Local Testing Guide for dj-postgres-mcp

This guide will help you test the dj-postgres-mcp package locally before publishing to npm.

## Prerequisites

1. Ensure you have Node.js installed (v18 or higher)
2. PostgreSQL database available for testing
3. The `dj-config-mcp` dependency built and available at `../dj-config-mcp`

## Step 1: Build the dj-config-mcp dependency

Since this package depends on a local package, you need to ensure it's available:

```bash
cd ../dj-config-mcp
npm install
# No build step needed as it's a plain JavaScript package
```

## Step 2: Build dj-postgres-mcp

```bash
# In the dj-postgres-mcp directory
npm install
npm run build
```

## Step 3: Configure using Web UI

The dj-config-mcp package provides a web UI for configuration:

```bash
# In the dj-config-mcp directory
cd ../dj-config-mcp
npx mcp-config config-ui

# Or with a custom port
npx mcp-config config-ui --port 3456
```

This will open a web interface at http://localhost:3456 where you can:
- Configure PostgreSQL connection settings
- Manage sensitive and non-sensitive configuration values
- Export/import configurations
- See which values come from environment variables vs config files

## Step 4: Test using MCP Inspector

The MCP Inspector is the best way to test your MCP server interactively:

```bash
npx @modelcontextprotocol/inspector build/index.js
```

This will open a web interface where you can:
- See all available tools
- Test tool invocations
- View server logs
- Debug configuration issues

## Step 5: Create a local test project

```bash
# Create a test directory
mkdir test-local
cd test-local

# Create package.json
cat > package.json << EOF
{
  "name": "test-dj-postgres-mcp",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@devjoy-digital/dj-postgres-mcp": "file:.."
  }
}
EOF

# Install dependencies
npm install
```

## Step 6: Create a test configuration

Create a `postgres-config.json` file:

```json
{
  "host": "localhost",
  "port": 5432,
  "database": "test_db",
  "username": "your_username",
  "password": "your_password",
  "defaultSchema": "public"
}
```

## Step 7: Test with npm link (Alternative approach)

If you want to test as if the package was installed globally:

```bash
# In dj-postgres-mcp directory
npm link

# In any test project
npm link @devjoy-digital/dj-postgres-mcp
```

## Step 8: Test the CLI directly

```bash
# Run the server
node build/index.js

# With a config file
CONFIG_PATH=./postgres-config.json node build/index.js
```

## Step 9: Integration with AI Assistants

### Claude Desktop

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "postgres-local": {
      "command": "node",
      "args": ["D:/path/to/dj-postgres-mcp/build/index.js"],
      "env": {
        "CONFIG_PATH": "D:/path/to/postgres-config.json"
      }
    }
  }
}
```

## Common Issues and Solutions

### Issue: Cannot find module 'dj-config-mcp'

**Solution**: Ensure the dj-config-mcp package exists at `../dj-config-mcp` and has been installed:
```bash
cd ../dj-config-mcp
npm install
```

### Issue: PostgreSQL connection errors

**Solution**: 
1. Verify PostgreSQL is running
2. Check your connection credentials in the config file
3. Ensure the database exists and is accessible

### Issue: Permission denied when running the built script

**Solution**: The build process should set execute permissions, but if needed:
```bash
chmod +x build/index.js
```

## Pre-publish Checklist

Before publishing to npm:

1. ✅ All tests pass
2. ✅ MCP Inspector shows all tools working correctly
3. ✅ Configuration management works properly
4. ✅ PostgreSQL operations execute successfully
5. ✅ Error handling works as expected
6. ✅ README.md is up to date
7. ✅ Version number is updated in package.json
8. ✅ CHANGELOG.md is updated

## Publishing to npm

Once all tests pass:

```bash
# Login to npm (if not already)
npm login

# Publish
npm publish --access public
```

## Post-publish Testing

After publishing, test the published package:

```bash
# In a new directory
npm init -y
npm install @devjoy-digital/dj-postgres-mcp
npx @modelcontextprotocol/inspector node_modules/@devjoy-digital/dj-postgres-mcp/build/index.js
```