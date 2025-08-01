#!/usr/bin/env node
/**
 * PostgreSQL MCP Server
 *
 * A stateless MCP server that provides PostgreSQL database access
 * with per-client session management for connection strings.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PostgresServer } from './PostgresServer.js';
import { log, logError } from './features/shared/logger.js';
async function main() {
    log('main: Starting PostgreSQL MCP Server v0.9.1');
    log('main: Server details', {
        name: 'dj-postgres-mcp',
        version: '0.9.1',
        nodeVersion: process.version
    });
    try {
        // Create server instance
        const postgresServer = new PostgresServer();
        const server = postgresServer.getServer();
        // Create transport
        log('main: Creating stdio transport');
        const transport = new StdioServerTransport();
        // Connect server to transport
        log('main: Connecting server to transport');
        await server.connect(transport);
        log('main: Server connected successfully');
        log('main: Server running on stdio');
        // Handle shutdown gracefully
        process.on('SIGINT', async () => {
            log('main: Received SIGINT, shutting down gracefully');
            await postgresServer.cleanup();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            log('main: Received SIGTERM, shutting down gracefully');
            await postgresServer.cleanup();
            process.exit(0);
        });
    }
    catch (error) {
        logError('main: Fatal error during server startup', error);
        process.exit(1);
    }
}
// Error handling
process.on('uncaughtException', (error) => {
    logError('Process: Uncaught exception', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logError('Process: Unhandled rejection', reason);
    process.exit(1);
});
// Start the server
main().catch((error) => {
    logError('main: Server failed to start', error);
    process.exit(1);
});
