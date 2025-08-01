/**
 * Consistent message formatting utilities for user-facing messages
 */

export const MessageFormatter = {
  // Success messages with consistent emoji and format
  success: {
    connection: (details: string) => `✅ Connection successful\n${details}`,
    configuration: (details: string) => `✅ Configuration saved\n${details}`,
    query: (rowCount: number, time: number) => `✅ Query executed successfully\n- Rows affected: ${rowCount}\n- Execution time: ${time}ms`,
    tableCreated: (tableName: string) => `✅ Table "${tableName}" created successfully`,
    general: (message: string) => `✅ ${message}`
  },

  // Error messages with consistent format
  error: {
    connection: (error: string) => `❌ Connection failed\n${error}`,
    configuration: (error: string) => `❌ Configuration failed\n${error}`,
    query: (error: string) => `❌ Query execution failed\n${error}`,
    validation: (field: string, issue: string) => `❌ Invalid ${field}: ${issue}`,
    notFound: (resource: string, identifier: string) => `❌ ${resource} "${identifier}" not found`,
    general: (error: string) => `❌ Error: ${error}`
  },

  // Info messages with consistent format
  info: {
    configuration: (host: string, port: number, database: string, user: string, ssl: boolean) => 
      `📋 Configuration Details:\n- Host: ${host}:${port}\n- Database: ${database}\n- User: ${user}\n- SSL: ${ssl ? 'enabled' : 'disabled'}`,
    tableCount: (count: number) => `📊 Found ${count} table${count !== 1 ? 's' : ''}`,
    queryPlan: (plan: string) => `📊 Query Plan:\n${plan}`,
    general: (message: string) => `ℹ️ ${message}`
  },

  // Warning messages
  warning: {
    deprecation: (feature: string, alternative: string) => `⚠️ Warning: ${feature} is deprecated. Use ${alternative} instead.`,
    performance: (issue: string) => `⚠️ Performance warning: ${issue}`,
    security: (issue: string) => `⚠️ Security warning: ${issue}`,
    general: (message: string) => `⚠️ ${message}`
  },

  // Headers for different sections
  headers: {
    tables: () => '📊 Database Tables',
    tableStructure: (schema: string, table: string) => `📋 Table Structure: ${schema}.${table}`,
    queryResults: () => '📊 Query Results',
    configuration: () => '🔧 PostgreSQL Configuration'
  },

  // Format lists consistently
  list: (items: string[], indent = '  ') => items.map(item => `${indent}• ${item}`).join('\n'),

  // Format key-value pairs consistently
  keyValue: (key: string, value: any, indent = '  ') => `${indent}${key}: ${value}`,

  // Sanitize sensitive information
  sanitize: {
    password: (password: string) => password ? '********' : 'not set',
    connectionString: (connStr: string) => connStr.replace(/:[^@]+@/, ':********@')
  }
};

// Export type for TypeScript
export type MessageFormatterType = typeof MessageFormatter;