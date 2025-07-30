# MCP Server Debugging: Lessons Learned

This document captures critical lessons from debugging timeout issues in a PostgreSQL MCP server. These insights will help accelerate future MCP development.

## Key Findings

### 1. **AVOID NPX - It Causes Timeouts**
**Problem**: Using `spawn('npx', [...])` to run configuration commands caused consistent timeouts in MCP Inspector.

**Why it fails**:
- NPX spawning adds significant overhead
- MCP clients have short timeout windows (often 10-30 seconds)
- Child process spawning is unreliable across platforms
- NPX may try to download packages, adding network latency

**Solution**: Use direct file operations instead:
```typescript
// ❌ BAD - Causes timeouts
await spawn('npx', ['@devjoy-digital/mcp-config', 'update-config', ...]);

// ✅ GOOD - Direct file operations
await fs.writeFile(configPath, JSON.stringify(config, null, 2));
```

### 2. **Server Startup Sequence Matters**

**Problem**: Slow initialization blocks MCP client connection.

**Solution**: Connect first, configure later:
```typescript
// ✅ Correct order
async function main() {
  // 1. Create minimal handler immediately
  configHandler = new McpConfigHandler();
  
  // 2. Initialize server and connect ASAP
  initializeServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // 3. Load configuration asynchronously AFTER connection
  configHandler.initialize().catch(error => {
    // Don't fail server startup
    console.error('Config load failed:', error);
  });
}
```

### 3. **Defensive Programming for Database Connections**

**Problem**: Attempting database connections with invalid/default config causes 30+ second timeouts.

**Solution**: Fail fast with validation:
```typescript
async function createClient(): Promise<Client> {
  // Check configuration BEFORE attempting connection
  if (!configHandler?.isConfigured()) {
    throw new Error('Database not configured. Use config tool first.');
  }
  
  // Validate password specifically
  if (!config.password) {
    throw new Error('Database password not set.');
  }
  
  // Only NOW attempt connection
  const client = new Client(config);
  await client.connect();
}
```

### 4. **Comprehensive Logging is Essential**

**Problem**: MCP Inspector only shows stderr, making debugging difficult without logs.

**Solution**: Create a logging utility with timestamps:
```typescript
export function log(message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [MCP] ${message}`;
  
  if (data) {
    console.error(logMessage, JSON.stringify(data, null, 2));
  } else {
    console.error(logMessage);
  }
}
```

Log at every critical point:
- Server startup phases
- Handler registration
- Tool execution start/end
- Configuration loading steps
- Connection attempts

### 5. **Configuration Loading Strategy**

**Problem**: Complex configuration systems with multiple sources can fail silently.

**Solution**: Load in priority order with fallbacks:
```typescript
private async loadConfig(): Promise<void> {
  // 1. Load .env file first (for secrets)
  await this.loadEnvFile();
  
  // 2. Apply environment variables
  this.loadFromEnvironment();
  
  // 3. Load global config (lower priority)
  if (await this.fileExists(globalConfigPath)) {
    const globalConfig = JSON.parse(await fs.readFile(globalConfigPath));
    this.config = { ...this.config, ...globalConfig.postgres };
  }
  
  // 4. Load local config (highest priority)
  if (await this.fileExists(localConfigPath)) {
    const localConfig = JSON.parse(await fs.readFile(localConfigPath));
    this.config = { ...this.config, ...localConfig.postgres };
  }
  
  // 5. Re-apply env vars (ultimate override)
  this.loadFromEnvironment();
}
```

### 6. **Version Management During Development**

**Tip**: Increment patch version with every change during debugging:
- Use semantic versioning: `1.1.0` → `1.1.1` → `1.1.2`
- Include version in startup logs
- Helps track which build is actually running

### 7. **MCP Inspector as Development Tool**

**Best Practices**:
- Always test in MCP Inspector before client integration
- Watch stderr output for detailed logs
- Test each tool individually
- Verify configuration persistence

**Debugging Workflow**:
1. Add comprehensive logging
2. Build and run in Inspector
3. Check stderr for execution flow
4. Identify where timeouts occur
5. Fix and increment version
6. Repeat

### 8. **Manual .env Loading**

**Problem**: MCP servers run in minimal environments without automatic .env loading.

**Solution**: Implement manual .env loader:
```typescript
private async loadEnvFile(): Promise<void> {
  const envPath = path.resolve(process.cwd(), '.env');
  if (await this.fileExists(envPath)) {
    const content = await fs.readFile(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const [key, ...valueParts] = line.trim().split('=');
      if (key && valueParts.length) {
        process.env[key] = valueParts.join('=');
      }
    });
  }
}
```

### 9. **Timeout Handling**

**Add timeouts to prevent hanging**:
```typescript
// For config file loading
await Promise.race([
  configLoadPromise,
  new Promise(resolve => setTimeout(resolve, 1000))
]);

// For database connections
const client = new Client({
  ...config,
  connectionTimeoutMillis: 30000,
  query_timeout: 60000
});
```

### 10. **Error Messages Should Guide Users**

**Instead of generic errors, provide actionable guidance**:
```typescript
throw new Error(
  'Database connection not configured. Please use the "config" tool:\n' +
  '  - host: PostgreSQL server hostname\n' +
  '  - port: PostgreSQL server port (default: 5432)\n' +
  '  - database: Database name\n' +
  '  - user: Database username\n' +
  '  - password: Database password'
);
```

## Summary Checklist for New MCP Projects

- [ ] Avoid NPX and subprocess spawning
- [ ] Connect to MCP transport immediately
- [ ] Load configuration asynchronously
- [ ] Validate configuration before using it
- [ ] Implement comprehensive timestamped logging
- [ ] Test everything in MCP Inspector first
- [ ] Handle .env files manually
- [ ] Add reasonable timeouts
- [ ] Provide clear, actionable error messages
- [ ] Version every build during development

## Quick Debug Process

1. **User reports timeout** → Add logging everywhere
2. **Build and test in Inspector** → Check stderr output
3. **Find blocking operation** → Usually NPX, network, or file I/O
4. **Replace with direct operations** → Remove subprocess spawning
5. **Test again** → Verify timeout is resolved

Remember: MCP clients expect fast responses. When in doubt, fail fast with clear errors rather than attempting slow operations.