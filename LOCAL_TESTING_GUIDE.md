# Local Testing Guide for PostgreSQL MCP Server

## Overview
Your PostgreSQL MCP Server has been successfully configured with:
- ✅ Configuration tools hidden from clients
- ✅ Interactive configuration mode removed
- ✅ Only database operation tools exposed to clients

## Testing Methods

### Method 1: Direct Execution (Simplest)

Run the server directly from this directory:

```bash
node build/index.js
```

The server will start and listen on stdio. Your MCP client can connect to this process.

### Method 2: Using npm link (Recommended for realistic testing)

The package has already been linked globally. Now you can use it in any project:

1. **In another project directory**, run:
   ```bash
   npm link @devjoy-digital/postgres-server-mcp
   ```

2. **Configure your MCP client** to use the server. For example, in your MCP client configuration:
   ```json
   {
     "mcpServers": {
       "postgres": {
         "command": "npx",
         "args": ["@devjoy-digital/postgres-server-mcp"]
       }
     }
   }
   ```

### Method 3: Test with Claude Desktop (if using)

If you're using Claude Desktop, add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "node",
      "args": ["D:/Workspace/Repos/jamaynor/mcps/postgres-mcp-server/build/index.js"]
    }
  }
}
```

## What to Test

### 1. Verify Hidden Configuration Tools
- Check that only these 3 tools are visible to clients:
  - `execute_query`
  - `describe_table` 
  - `list_tables`

### 2. Verify Configuration Tools Are Hidden
- Confirm these tools are NOT visible:
  - `config_connection`
  - `get_connection_info`
  - `update_configuration`
  - `test_connection`
  - `config_connection_interactive` (removed completely)

### 3. Test Database Operations
- Try executing SQL queries
- Test table descriptions
- List database tables

## Configuration

The server still uses the mcp-config system internally for database connections. You can configure it using:

- Environment variables (POSTGRES_HOST, POSTGRES_USER, etc.)
- Configuration files in the `config/` directory
- The `@devjoy-digital/mcp-config` CLI tool directly

## Troubleshooting

If you need to unlink the package later:
```bash
npm unlink @devjoy-digital/postgres-server-mcp
```

To rebuild after making changes:
```bash
npm run build
```

The changes will be immediately available to any linked projects without needing to re-link.
