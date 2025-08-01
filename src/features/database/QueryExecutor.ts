import { Client } from 'pg';
import { QueryResult, TableInfo, TableDescription } from './types.js';
import { log } from '../shared/logger.js';
import { ManagedError, ErrorCodes } from '../shared/errors.js';

// PostgreSQL data type mappings
const PG_DATA_TYPES: Record<number, string> = {
  16: 'bool',
  17: 'bytea',
  18: 'char',
  19: 'name',
  20: 'int8',
  21: 'int2',
  23: 'int4',
  25: 'text',
  26: 'oid',
  114: 'json',
  700: 'float4',
  701: 'float8',
  1000: '_bool',
  1001: '_bytea',
  1002: '_char',
  1003: '_name',
  1005: '_int2',
  1007: '_int4',
  1009: '_text',
  1014: '_bpchar',
  1015: '_varchar',
  1016: '_int8',
  1021: '_float4',
  1022: '_float8',
  1042: 'bpchar',
  1043: 'varchar',
  1082: 'date',
  1083: 'time',
  1114: 'timestamp',
  1115: '_timestamp',
  1184: 'timestamptz',
  1185: '_timestamptz',
  1186: 'interval',
  1187: '_interval',
  1231: '_numeric',
  1263: '_cstring',
  1700: 'numeric',
  2950: 'uuid',
  2951: '_uuid',
  3802: 'jsonb',
  3807: '_jsonb'
};

export class QueryExecutor {
  async executeQuery(
    client: Client,
    query: string,
    params?: Array<string | number | boolean | null>
  ): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      log('QueryExecutor: Executing query', { 
        command: query.substring(0, 50),
        paramCount: params?.length || 0 
      });

      const result = await client.query(query, params || []);
      const executionTime = Date.now() - startTime;

      const fields = result.fields?.map(field => ({
        name: field.name,
        dataTypeID: field.dataTypeID,
        dataTypeName: PG_DATA_TYPES[field.dataTypeID] || `oid:${field.dataTypeID}`
      })) || [];

      log('QueryExecutor: Query completed', { 
        rowCount: result.rowCount,
        executionTime,
        command: result.command
      });

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        command: result.command || 'UNKNOWN',
        fields,
        executionTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Categorize database errors
      if (errorMessage.includes('permission denied')) {
        throw new ManagedError(
          ErrorCodes.PERMISSION_DENIED,
          'Permission denied for this operation',
          { query: query.substring(0, 100) }
        );
      } else if (errorMessage.includes('does not exist')) {
        throw new ManagedError(
          ErrorCodes.TABLE_NOT_FOUND,
          errorMessage,
          { query: query.substring(0, 100) }
        );
      } else if (errorMessage.includes('syntax error')) {
        throw new ManagedError(
          ErrorCodes.QUERY_ERROR,
          `SQL syntax error: ${errorMessage}`,
          { query: query.substring(0, 100) }
        );
      }

      throw new ManagedError(
        ErrorCodes.QUERY_ERROR,
        `Query execution failed: ${errorMessage}`,
        { 
          query: query.substring(0, 100),
          executionTime: Date.now() - startTime
        }
      );
    }
  }

  async listTables(client: Client, schema?: string): Promise<TableInfo[]> {
    let query = `
      SELECT 
        schemaname as schema_name,
        tablename as table_name,
        tableowner as table_owner,
        hasindexes as has_indexes,
        hastriggers as has_triggers
      FROM pg_tables 
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
    `;

    const params: string[] = [];
    if (schema) {
      query += ' AND schemaname = $1';
      params.push(schema);
    }

    query += ' ORDER BY schemaname, tablename';

    const result = await client.query(query, params);
    
    return result.rows.map(row => ({
      schema_name: row.schema_name,
      table_name: row.table_name,
      table_owner: row.table_owner,
      has_indexes: row.has_indexes,
      has_triggers: row.has_triggers
    }));
  }

  async describeTable(
    client: Client,
    tableName: string,
    schema: string = 'public'
  ): Promise<TableDescription> {
    // Get column information
    const columnQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;

    const columnResult = await client.query(columnQuery, [schema, tableName]);

    if (columnResult.rows.length === 0) {
      throw new ManagedError(
        ErrorCodes.TABLE_NOT_FOUND,
        `Table "${schema}"."${tableName}" not found`
      );
    }

    // Get index information
    const indexQuery = `
      SELECT 
        indexname as index_name,
        indexdef as index_definition
      FROM pg_indexes 
      WHERE schemaname = $1 AND tablename = $2
    `;

    const indexResult = await client.query(indexQuery, [schema, tableName]);

    // Get primary key information
    const pkQuery = `
      SELECT 
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
    `;

    const pkResult = await client.query(pkQuery, [schema, tableName]);
    const primaryKeyColumns = new Set(pkResult.rows.map(row => row.column_name));

    // Build response
    const columns = columnResult.rows.map(col => ({
      column_name: col.column_name,
      data_type: col.data_type,
      is_nullable: col.is_nullable,
      column_default: col.column_default,
      character_maximum_length: col.character_maximum_length,
      numeric_precision: col.numeric_precision,
      numeric_scale: col.numeric_scale,
      is_primary_key: primaryKeyColumns.has(col.column_name)
    }));

    const indexes = indexResult.rows.map(idx => ({
      index_name: idx.index_name,
      index_definition: idx.index_definition,
      is_primary: primaryKeyColumns.size > 0 && idx.index_definition.includes([...primaryKeyColumns].join(', ')),
      is_unique: idx.index_definition.toLowerCase().includes('unique')
    }));

    return {
      schema,
      table: tableName,
      columns,
      indexes
    };
  }
}