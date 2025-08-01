import { Client } from 'pg';
import { QueryExecutor } from '../../features/database/QueryExecutor.js';
import { ConfigHandler } from '../../handlers/ConfigHandler.js';

// Real database integration test for QueryExecutor
// Requires Docker PostgreSQL to be running on localhost:5432

const TEST_DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'test_db',
  user: 'postgres',
  password: 'postgres',
  ssl: false
};

describe('QueryExecutor - Real Database Integration', () => {
  let queryExecutor: QueryExecutor;
  let client: Client;
  let configHandler: ConfigHandler;

  beforeAll(async () => {
    // Set up real database connection
    client = new Client(TEST_DB_CONFIG);
    await client.connect();

    // Create test schema and tables for testing
    await client.query('DROP SCHEMA IF EXISTS test_schema CASCADE');
    await client.query('CREATE SCHEMA IF NOT EXISTS test_schema');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        age INTEGER CHECK (age > 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS test_schema.custom_table (
        id SERIAL PRIMARY KEY,
        data TEXT
      )
    `);

    // Insert test data
    await client.query(`
      INSERT INTO test_users (name, email, age) 
      VALUES ('Alice', 'alice@test.com', 30), ('Bob', 'bob@test.com', 25)
      ON CONFLICT (email) DO NOTHING
    `);
    
    configHandler = new ConfigHandler();
    await configHandler.handleToolCall('configure_connection', TEST_DB_CONFIG);
    
    queryExecutor = new QueryExecutor();
  });

  afterAll(async () => {
    // Clean up test data
    await client.query('DROP TABLE IF EXISTS test_users CASCADE');
    await client.query('DROP SCHEMA IF EXISTS test_schema CASCADE');
    await client.end();
  });

  describe('executeQuery', () => {
    it('should execute SELECT queries successfully', async () => {
      const result = await queryExecutor.executeQuery(
        client,
        'SELECT name, email FROM test_users ORDER BY name'
      );

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].name).toBe('Alice');
      expect(result.rows[1].name).toBe('Bob');
      expect(result.rowCount).toBe(2);
      expect(result.command).toBe('SELECT');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should execute parameterized queries', async () => {
      const result = await queryExecutor.executeQuery(
        client,
        'SELECT * FROM test_users WHERE age > $1',
        [25]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Alice');
      expect(result.rows[0].age).toBe(30);
    });

    it('should execute INSERT queries', async () => {
      const result = await queryExecutor.executeQuery(
        client,
        "INSERT INTO test_users (name, email, age) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING",
        ['Charlie', 'charlie@test.com', 35]
      );

      expect(result.rowCount).toBeGreaterThanOrEqual(0); // 0 if already exists, 1 if inserted
      expect(result.command).toBe('INSERT');
    });

    it('should handle query errors gracefully', async () => {
      await expect(
        queryExecutor.executeQuery(client, 'SELECT * FROM nonexistent_table')
      ).rejects.toThrow();
    });
  });

  describe('listTables', () => {
    it('should list all tables', async () => {
      const result = await queryExecutor.listTables(client);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      const testTable = result.find(t => t.table_name === 'test_users');
      expect(testTable).toBeDefined();
      expect(testTable?.schema_name).toBe('public');
    });

    it('should list tables for specific schema', async () => {
      const result = await queryExecutor.listTables(client, 'test_schema');
      
      expect(Array.isArray(result)).toBe(true);
      const customTable = result.find(t => t.table_name === 'custom_table');
      expect(customTable).toBeDefined();
      expect(customTable?.schema_name).toBe('test_schema');
    });

    it('should return empty array for non-existent schema', async () => {
      const result = await queryExecutor.listTables(client, 'nonexistent_schema');
      expect(result).toHaveLength(0);
    });
  });

  describe('describeTable', () => {
    it('should describe table structure', async () => {
      const result = await queryExecutor.describeTable(client, 'test_users', 'public');
      
      expect(result.schema).toBe('public');
      expect(result.table).toBe('test_users');
      expect(result.columns).toHaveLength(5); // id, name, email, age, created_at
      
      // Check id column (primary key)
      const idColumn = result.columns.find(c => c.column_name === 'id');
      expect(idColumn).toBeDefined();
      expect(idColumn?.data_type).toBe('integer');
      expect(idColumn?.is_nullable).toBe('NO');
      expect(idColumn?.is_primary_key).toBe(true);
      
      // Check name column
      const nameColumn = result.columns.find(c => c.column_name === 'name');
      expect(nameColumn).toBeDefined();
      expect(nameColumn?.data_type).toBe('character varying');
      expect(nameColumn?.is_nullable).toBe('NO');
      expect(nameColumn?.character_maximum_length).toBe(255);
      
      // Check indexes
      expect(result.indexes).toBeDefined();
      expect(Array.isArray(result.indexes)).toBe(true);
    });

    it('should handle non-existent table gracefully', async () => {
      await expect(
        queryExecutor.describeTable(client, 'nonexistent_table', 'public')
      ).rejects.toThrow();
    });
  });

  describe('data type mapping', () => {
    it('should handle various PostgreSQL data types', async () => {
      // Create a table with various data types
      await client.query(`
        CREATE TEMPORARY TABLE type_test_table (
          int_col INTEGER,
          text_col TEXT,
          bool_col BOOLEAN,
          json_col JSONB,
          timestamp_col TIMESTAMP,
          decimal_col DECIMAL(10,2)
        )
      `);

      const result = await queryExecutor.describeTable(client, 'type_test_table', 'pg_temp');
      
      expect(result.columns.find(c => c.column_name === 'int_col')?.data_type).toBe('integer');
      expect(result.columns.find(c => c.column_name === 'text_col')?.data_type).toBe('text');
      expect(result.columns.find(c => c.column_name === 'bool_col')?.data_type).toBe('boolean');
      expect(result.columns.find(c => c.column_name === 'json_col')?.data_type).toBe('jsonb');
      expect(result.columns.find(c => c.column_name === 'timestamp_col')?.data_type).toContain('timestamp');
      expect(result.columns.find(c => c.column_name === 'decimal_col')?.data_type).toBe('numeric');
    });
  });

  describe('error handling', () => {
    it('should provide meaningful error messages', async () => {
      await expect(
        queryExecutor.executeQuery(client, 'INVALID SQL SYNTAX')
      ).rejects.toThrow(/syntax error/i);
    });

    it('should handle connection errors gracefully', async () => {
      const badClient = new Client({
        host: 'nonexistent-host',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test'
      });

      await expect(
        queryExecutor.executeQuery(badClient, 'SELECT 1')
      ).rejects.toThrow();
    });
  });
});