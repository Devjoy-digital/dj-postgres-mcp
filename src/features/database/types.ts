/**
 * Query result from PostgreSQL
 * Note: camelCase is used for application-level fields
 */
export interface QueryResult {
  rows: Array<Record<string, any>>;
  rowCount: number;
  command: string;
  fields: Array<{
    name: string;
    dataTypeID: number;
    dataTypeName?: string;
  }>;
  executionTime?: number;
}

/**
 * Table information from PostgreSQL system catalogs
 * Note: snake_case is used to match PostgreSQL column names
 */
export interface TableInfo {
  schema_name: string;
  table_name: string;
  table_owner: string;
  table_size?: string;
  row_count?: number;
  has_indexes: boolean;
  has_triggers: boolean;
}

/**
 * Column information from PostgreSQL information_schema
 * Note: snake_case is used to match PostgreSQL column names
 */
export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_primary_key?: boolean;
  is_foreign_key?: boolean;
}

export interface IndexInfo {
  index_name: string;
  index_definition: string;
  is_primary: boolean;
  is_unique: boolean;
}

export interface TableDescription {
  schema: string;
  table: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
}