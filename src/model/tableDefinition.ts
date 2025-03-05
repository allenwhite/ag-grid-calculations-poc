import { CellStyle, ColDef, ValueGetterFunc } from "@ag-grid-community/core";
import {
  Calculations,
  Condition,
  IfCondition,
  AverageIf,
  instanceOfIfCondition,
} from "./calculations";
import { getCrossTableData, parseFieldReference } from "./tableRegistry";

interface RowData {
  [key: string]: any; // TODO: come back to this
}

interface Params {
  data: RowData;
  node: {
    rowIndex: number;
  };
}

type CalculationResult = string | number;

interface TableDefinition {
  id: string;
  description: string;
  columnDefinitions: ColumnDefinition[];
}

interface ComparativeDef {
  field: string;
  value?: any;
}

class StyleRule {
  conditions: ComparativeDef[];
  style: CellStyle;

  constructor(conditions: ComparativeDef[], style: CellStyle) {
    this.conditions = conditions;
    this.style = style;
  }
}

interface ColumnDefinition {
  headerName: string;
  field: string;
  editable: boolean;
  options?: string[] | null;
  cellStyleRules?: StyleRule[] | null;
  calculations?: Calculations | null;
}

class ColumnDefinition {
  headerName: string;
  field: string;
  editable: boolean;
  options?: string[] | null;
  cellStyleRules?: StyleRule[] | null;
  calculations?: Calculations | null;

  constructor(
    headerName: string,
    field: string,
    editable: boolean,
    options?: string[] | null,
    cellStyleRules?: StyleRule[] | null,
    calculations?: Calculations | null
  ) {
    this.headerName = headerName;
    this.field = field;
    this.editable = editable;
    this.options = options;
    this.cellStyleRules = cellStyleRules;
    this.calculations = calculations;
  }
}

class CalculationTable implements TableDefinition {
  id: string;
  description: string;
  columnDefinitions: ColumnDefinition[];

  constructor(
    description: string,
    columnDefinitions: ColumnDefinition[],
    id: string
  ) {
    this.description = description;
    this.columnDefinitions = columnDefinitions;
    this.id = id;
  }
}

const getColDefs = (
  columnDefinitions: ColumnDefinition[],
  rowData: RowData[]
): ColDef[] => {
  return columnDefinitions.map((cd) => ({
    headerName: cd.headerName,
    field: cd.field,
    editable: cd.editable,
    cellEditor: cd.options ? "agSelectCellEditor" : undefined,
    cellEditorParams: cd.options
      ? {
          values: cd.options,
        }
      : undefined,
    valueFormatter: (params: any) => {
      if (params.value === null || params.value === undefined) {
        return "";
      }
      return params.value;
    },
    cellStyle: (params: any) => {
      if (cd.cellStyleRules) {
        return applyStyleRules(params, cd.cellStyleRules);
      }
      return null;
    },
    valueGetter: (params: any) => {
      if (!cd.calculations) {
        return params.data[cd.field];
      }

      // Process calculations with the original doCalculation function
      return doCalculation(params, cd.calculations, rowData);
    },
  }));
};

function applyStyleRules(params: any, rules: StyleRule[]): CellStyle {
  // console.log(params, rules);
  for (const rule of rules) {
    const { conditions, style } = rule;

    const allConditionsMet = conditions.every((condition: any) => {
      // Check if the condition references another table
      if (condition.field.includes('.')) {
        const fieldRef = parseFieldReference(condition.field);
        if (fieldRef) {
          const value = getCrossTableData(condition.field, params.node.rowIndex);
          
          if (condition.value !== undefined && value !== condition.value) {
            return false;
          }
          
          if (condition.greaterThan !== undefined && value <= condition.greaterThan) {
            return false;
          }
          
          return true;
        }
      }
      
      // Regular field reference
      const fieldValue = params.data[condition.field];

      if (condition.value !== undefined && fieldValue !== condition.value) {
        return false;
      }

      if (
        condition.greaterThan !== undefined &&
        fieldValue <= condition.greaterThan
      ) {
        return false;
      }

      return true;
    });

    if (allConditionsMet) {
      return style;
    }
  }
  return params.colDef.editable
    ? { backgroundColor: "lightgreen" }
    : { backgroundColor: "lightgray" };
}

function doCalculation(
  params: Params,
  calc: Calculations,
  rowData: RowData[]
): CalculationResult {
  // Helper function to evaluate conditions
  function evaluateConditions(conditions: Condition[], check: string): boolean {
    return check === "all"
      ? conditions.every((cond) => {
          // Check if the condition references another table
          if (cond.field.includes('.')) {
            const fieldRef = parseFieldReference(cond.field);
            if (fieldRef) {
              const value = getCrossTableData(cond.field, params.node.rowIndex);
              return cond.equals !== undefined
                ? value === cond.equals
                : cond.lessThan !== undefined
                ? value < cond.lessThan
                : false;
            }
          }
          
          // Regular field reference
          const fieldValue = params.data[cond.field];
          return cond.equals !== undefined
            ? fieldValue === cond.equals
            : cond.lessThan !== undefined
            ? fieldValue < cond.lessThan
            : false;
        })
      : conditions.some((cond) => {
          // Check if the condition references another table
          if (cond.field.includes('.')) {
            const fieldRef = parseFieldReference(cond.field);
            if (fieldRef) {
              const value = getCrossTableData(cond.field, params.node.rowIndex);
              return cond.equals !== undefined
                ? value === cond.equals
                : cond.lessThan !== undefined
                ? value < cond.lessThan
                : false;
            }
          }
          
          // Regular field reference
          const fieldValue = params.data[cond.field];
          return cond.equals !== undefined
            ? fieldValue === cond.equals
            : cond.lessThan !== undefined
            ? fieldValue < cond.lessThan
            : false;
        });
  }

  function evaluateIfCondition(
    params: Params,
    condition: IfCondition,
    rowData: RowData[]
  ): CalculationResult {
    console.log(11, condition);
    const conditionsMet = evaluateConditions(
      condition.conditions,
      condition.check
    );

    if (conditionsMet) {
      // Recursively evaluate if the 'then' part is another condition
      if (instanceOfIfCondition(condition.then)) {
        return evaluateIfCondition(params, condition.then, rowData);
      }
      
      // Check if the result is a cross-table reference
      if (typeof condition.then === 'string' && condition.then.includes('.')) {
        const fieldRef = parseFieldReference(condition.then);
        if (fieldRef) {
          return getCrossTableData(condition.then, params.node.rowIndex);
        }
      }
      
      return condition.then.toString();
    } else {
      // Recursively evaluate if the 'else' part is another condition
      if (instanceOfIfCondition(condition.else)) {
        return evaluateIfCondition(params, condition.else, rowData);
      }
      
      // Check if the result is a cross-table reference
      if (typeof condition.else === 'string' && condition.else.includes('.')) {
        const fieldRef = parseFieldReference(condition.else);
        if (fieldRef) {
          return getCrossTableData(condition.else, params.node.rowIndex);
        }
      }
      
      return condition.else;
    }
  }

  // Handle cross-table references in Excel formulas
  if (calc.excel) {
    const excelFormula = calc.excel;
    
    // Check if the formula contains cross-table references
    const crossTableRegex = /t[12]\.[a-zA-Z]+/g;
    const crossTableMatches = excelFormula.match(crossTableRegex);
    
    if (crossTableMatches && crossTableMatches.length > 0) {
      // For simple references (just the field name), return the value directly
      if (excelFormula === crossTableMatches[0]) {
        const fieldRef = parseFieldReference(excelFormula);
        if (fieldRef) {
          return getCrossTableData(excelFormula, params.node.rowIndex);
        }
      }
      
      // For more complex formulas, we would need to evaluate the expression
      // This is a simplified implementation
      let result = excelFormula;
      
      // Replace each cross-table reference with its value
      for (const match of crossTableMatches) {
        const fieldRef = parseFieldReference(match);
        if (fieldRef) {
          const value = getCrossTableData(match, params.node.rowIndex);
          result = result.replace(match, value !== null && value !== undefined ? value : '""');
        }
      }
      
      // Remove the Excel formula prefix if present
      if (result.startsWith('=')) {
        result = result.substring(1);
      }
      
      return result;
    }
    
    // If no cross-table references, use the original evaluateExcelFormula
    return evaluateExcelFormula(params, rowData, excelFormula);
  }

  // Evaluate the 'if' condition
  if (calc.if) {
    let test = evaluateIfCondition(params, calc.if, rowData);
    return JSON.stringify(test);
  }

  // Default return if no conditions are met
  return "Unsupported calculation";
}

function evaluateExcelFormula(
  params: Params,
  rowData: RowData[],
  formula: string
): CalculationResult {
  return formula; // Return the formula as a string if not supported
}

/**
 * aggregation
 * referencing another table
 * 
 * 
      "calculations": "a*c"
 */

export { CalculationTable, getColDefs, ColumnDefinition };
