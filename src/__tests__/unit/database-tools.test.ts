import { Client } from 'pg';
import { QueryExecutor } from '../../features/database/QueryExecutor.js';
import { ConfigHandler } from '../../handlers/ConfigHandler.js';
import { handleExecuteQuery } from '../../features/database/tools/execute-query.js';
import { handleListTables } from '../../features/database/tools/list-tables.js';
import { handleDescribeTable } from '../../features/database/tools/describe-table.js';

// Real database integration test for database tools
// Requires Docker PostgreSQL to be running on localhost:5432

const TEST_DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'test_db',
  user: 'postgres',
  password: 'postgres',
  ssl: false
};

describe('Database Tools - Real Database Integration', () => {
  let client: Client;
  let queryExecutor: QueryExecutor;
  let configHandler: ConfigHandler;

  beforeAll(async () => {
    // Create config handler with test database
    configHandler = new ConfigHandler();
    await configHandler.handleToolCall('configure_connection', TEST_DB_CONFIG);

    // Test connection
    client = new Client(TEST_DB_CONFIG);

    try {
      await client.connect();
      
      // Create test schema
      await client.query('DROP TABLE IF EXISTS test_users CASCADE');
      await client.query(`
        CREATE TABLE test_users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE,
          age INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert test data
      await client.query(`
        INSERT INTO test_users (name, email, age) VALUES
        ('Alice', 'alice@example.com', 30),
        ('Bob', 'bob@example.com', 25),
        ('Charlie', 'charlie@example.com', 35)
      `);

      await client.end();
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw new Error('Tests require Docker PostgreSQL instance running on localhost:5432.');
    }

    queryExecutor = new QueryExecutor();
  });

  afterAll(async () => {
    // Clean up
    const cleanupClient = new Client(TEST_DB_CONFIG);
    try {
      await cleanupClient.connect();
      await cleanupClient.query('DROP TABLE IF EXISTS test_users CASCADE');
      await cleanupClient.end();
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  describe('Query Execution', () => {
    it('should execute SELECT queries', async () => {
      const result = await handleExecuteQuery(
        { query: 'SELECT * FROM test_users ORDER BY id' },
        configHandler
      );

      const text = result.content[0].text;
      expect(text).toContain('Alice');
      expect(text).toContain('Bob');
      expect(text).toContain('Charlie');
      expect(text).toContain('"rowCount": 3');
    });

    it('should execute parameterized queries', async () => {
      const result = await handleExecuteQuery(
        { 
          query: 'SELECT * FROM test_users WHERE age > $1 ORDER BY age',
          params: [30]
        },
        configHandler
      );

      const text = result.content[0].text;
      expect(text).toContain('Charlie');
      expect(text).not.toContain('Alice');
      expect(text).not.toContain('Bob');
    });

    it('should handle INSERT queries', async () => {
      const result = await handleExecuteQuery(
        {
          query: 'INSERT INTO test_users (name, email, age) VALUES ($1, $2, $3) RETURNING *',
          params: ['David', 'david@example.com', 28]
        },
        configHandler
      );

      const text = result.content[0].text;
      expect(text).toContain('David');
      expect(text).toContain('"command": "INSERT"');
      expect(text).toContain('"rowCount": 1');
    });

    it('should handle UPDATE queries', async () => {
      const result = await handleExecuteQuery(
        {
          query: 'UPDATE test_users SET age = age + 1 WHERE name = $1 RETURNING *',
          params: ['Alice']
        },
        configHandler
      );

      const text = result.content[0].text;
      expect(text).toContain('"command": "UPDATE"');
      expect(text).toContain('"age": 31');
    });

    it('should handle DELETE queries', async () => {
      const result = await handleExecuteQuery(
        {
          query: 'DELETE FROM test_users WHERE email = $1',
          params: ['david@example.com']
        },
        configHandler
      );

      const text = result.content[0].text;
      expect(text).toContain('"command": "DELETE"');
    });

    it('should handle aggregate queries', async () => {
      const result = await handleExecuteQuery(
        {
          query: 'SELECT COUNT(*) as total, AVG(age) as avg_age FROM test_users'
        },
        configHandler
      );

      const text = result.content[0].text;
      expect(text).toContain('total');
      expect(text).toContain('avg_age');
    });

    it('should handle syntax errors properly', async () => {
      await expect(
        handleExecuteQuery(
          { query: 'SELCT * FROM test_users' },
          configHandler
        )
      ).rejects.toThrow('SQL syntax error');
    });

    it('should handle table not found errors', async () => {
      await expect(
        handleExecuteQuery(
          { query: 'SELECT * FROM nonexistent_table' },
          configHandler
        )
      ).rejects.toThrow('does not exist');
    });
  });

  describe('Table Operations', () => {
    it('should list tables', async () => {
      const result = await handleListTables({}, configHandler);
      
      const text = result.content[0].text;
      expect(text).toContain('test_users');
      expect(text).toContain('"schema_name": "public"');
    });

    it('should describe table structure', async () => {
      const result = await handleDescribeTable(
        { table: 'test_users' },
        configHandler
      );

      const text = result.content[0].text;
      
      // Check columns
      expect(text).toContain('"column_name": "id"');
      expect(text).toContain('"data_type": "integer"');
      expect(text).toContain('"column_name": "name"');
      expect(text).toContain('"data_type": "character varying"');
      expect(text).toContain('"column_name": "email"');
      expect(text).toContain('"column_name": "age"');
      expect(text).toContain('"column_name": "created_at"');
      
      // Check primary key
      expect(text).toContain('"is_primary_key": true');
      
      // Check indexes
      expect(text).toContain('test_users_pkey');
      expect(text).toContain('test_users_email_key');
    });

    it('should handle table not found in describe', async () => {
      await expect(
        handleDescribeTable(
          { table: 'nonexistent_table' },
          configHandler
        )
      ).rejects.toThrow('Table "public"."nonexistent_table" not found');
    });
  });

  describe('Transaction Support', () => {
    it('should handle transactions', async () => {
      // Begin transaction
      await handleExecuteQuery(
        { query: 'BEGIN' },
        configHandler
      );

      // Insert within transaction
      await handleExecuteQuery(
        {
          query: 'INSERT INTO test_users (name, email, age) VALUES ($1, $2, $3)',
          params: ['Eve', 'eve@example.com', 40]
        },
        configHandler
      );

      // Rollback
      await handleExecuteQuery(
        { query: 'ROLLBACK' },
        configHandler
      );

      // Verify rollback worked
      const result = await handleExecuteQuery(
        {
          query: 'SELECT * FROM test_users WHERE name = $1',
          params: ['Eve']
        },
        configHandler
      );

      const text = result.content[0].text;
      expect(text).toContain('"rowCount": 0');
    });
  });
});