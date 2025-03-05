import { CalculationTable } from './tableDefinition';

// Global registry to store tables and their data
const tableRegistry: {
  tables: { [id: string]: CalculationTable };
  data: { [id: string]: any[] };
} = {
  tables: {},
  data: {}
};

/**
 * Register a table in the registry
 * @param table The table configuration
 * @param data The table data
 */
export function registerTable(table: CalculationTable, data: any[]): void {
  tableRegistry.tables[table.id] = table;
  tableRegistry.data[table.id] = data;
}

/**
 * Get data from a table by its ID
 * @param tableId The ID of the table
 * @returns The table data
 */
export function getTableData(tableId: string): any[] | null {
  return tableRegistry.data[tableId] || null;
}

/**
 * Get a table configuration by its ID
 * @param tableId The ID of the table
 * @returns The table configuration
 */
export function getTable(tableId: string): CalculationTable | null {
  return tableRegistry.tables[tableId] || null;
}

/**
 * Get data from another table based on field reference
 * @param fieldReference The field reference in format "tableId.fieldName"
 * @param rowIndex Optional row index for specific row
 * @returns The data from the referenced table
 */
export function getCrossTableData(fieldReference: string, rowIndex?: number): any {
  // Parse the field reference (format: tableId.fieldName)
  const [tableId, fieldName] = fieldReference.split('.');
  
  if (!tableId || !fieldName) {
    console.error(`Invalid field reference: ${fieldReference}`);
    return null;
  }
  
  // Get the table data
  const tableData = getTableData(tableId);
  if (!tableData) {
    console.error(`Table not found: ${tableId}`);
    return null;
  }
  
  // If row index is specified, return the value for that specific row
  if (rowIndex !== undefined && rowIndex >= 0 && rowIndex < tableData.length) {
    return tableData[rowIndex][fieldName];
  }
  
  // Otherwise, return all values for the field
  return tableData.map(row => row[fieldName]);
}

/**
 * Parse a field reference to extract table ID and field name
 * @param fieldReference The field reference in format "tableId.fieldName"
 * @returns Object containing tableId and fieldName
 */
export function parseFieldReference(fieldReference: string): { tableId: string; fieldName: string } | null {
  const parts = fieldReference.split('.');
  if (parts.length !== 2) {
    return null;
  }
  
  return {
    tableId: parts[0],
    fieldName: parts[1]
  };
}

/**
 * Perform an aggregation operation on data from another table
 * @param operation The operation to perform (SUM, AVG, COUNT, etc.)
 * @param fieldReference The field reference in format "tableId.fieldName"
 * @returns The result of the aggregation operation
 */
export function performAggregation(operation: string, fieldReference: string): any {
  // Get all values for the field
  const values = getCrossTableData(fieldReference);
  
  if (!values || !Array.isArray(values)) {
    return null;
  }
  
  // Convert string values to numbers where possible
  const numericValues = values.map(value => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  });
  
  // Perform the requested operation
  switch (operation.toUpperCase()) {
    case 'SUM':
      return numericValues.reduce((sum, value) => sum + value, 0);
    case 'AVG':
    case 'AVERAGE':
      return numericValues.length > 0 
        ? numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length 
        : 0;
    case 'COUNT':
      return values.length;
    case 'MAX':
      return numericValues.length > 0 ? Math.max(...numericValues) : 0;
    case 'MIN':
      return numericValues.length > 0 ? Math.min(...numericValues) : 0;
    default:
      console.error(`Unsupported operation: ${operation}`);
      return null;
  }
}

export default tableRegistry;
