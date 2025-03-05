import { CellStyle, ColDef, ValueGetterFunc } from "@ag-grid-community/core";
import {
  Calculations,
  Condition,
  IfCondition,
  AverageIf,
  instanceOfIfCondition,
} from "./calculations";

interface RowData {
  [key: string]: any; // TODO: come back to this
}

interface Params {
  data: RowData;
}

type CalculationResult = string | number;

interface TableDefinition {
  description: string;
  columnDefinitions: ColumnDefinitions[];
}

interface ComparativeDef {
  field: string;
}

class StyleRule {
  conditions: ComparativeDef[];
  style: CellStyle;

  constructor(conditions: ComparativeDef[], style: CellStyle) {
    this.conditions = conditions;
    this.style = style;
  }
}

interface ColumnDefinitions {
  headerName: string;
  field: string;
  editable: boolean;
  options?: string[] | null;
  cellStyleRules?: StyleRule[] | null;
  calculations?: Calculations | null;
}

class ColumnDefinitions {
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
  description: string;
  columnDefinitions: ColumnDefinitions[];

  constructor(description: string, columnDefinitions: ColumnDefinitions[]) {
    this.description = description;
    this.columnDefinitions = columnDefinitions;
  }
}

const getColDefs = (
  columnDefinitions: ColumnDefinitions[],
  rowData: RowData[]
): ColDef[] => {
  return columnDefinitions.map((cd) => ({
    headerName: cd.headerName,
    field: cd.field,
    editable: cd.editable,
    sortable: false,
    ...(cd.cellStyleRules
      ? {
          cellStyle: (params: any): CellStyle => {
            if (!cd.cellStyleRules) return {};
            return applyStyleRules(params, cd.cellStyleRules);
          },
        }
      : {}),
    ...(cd.options
      ? {
          cellEditor: "agSelectCellEditor",
          cellEditorParams: { values: cd.options },
        }
      : {}),
    ...(cd.calculations
      ? {
          valueGetter: (params: any) => {
            if (!cd.calculations) return 0;
            return doCalculation(params, cd.calculations, rowData);
          },
        }
      : {}),
  }));
};

function applyStyleRules(params: any, rules: StyleRule[]): CellStyle {
  // console.log(params, rules);
  for (const rule of rules) {
    const { conditions, style } = rule;

    const allConditionsMet = conditions.every((condition: any) => {
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
          const fieldValue = params.data[cond.field];
          return cond.equals !== undefined
            ? fieldValue === cond.equals
            : cond.lessThan !== undefined
            ? fieldValue < cond.lessThan
            : false;
        })
      : conditions.some((cond) => {
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
    const conditionsMet = evaluateConditions(
      condition.conditions,
      condition.check
    );

    if (conditionsMet) {
      // Recursively evaluate if the 'then' part is another condition
      if (instanceOfIfCondition(condition.then)) {
        return evaluateIfCondition(params, condition.then, rowData);
      }
      return condition.then;
    } else {
      // Recursively evaluate if the 'else' part is another condition
      if (instanceOfIfCondition(condition.else)) {
        return evaluateIfCondition(params, condition.else, rowData);
      }
      return condition.else;
    }
  }

  // Evaluate the 'if' condition
  if (calc.if) {
    return evaluateIfCondition(params, calc.if, rowData);
  }

  // Default return if no conditions are met
  // return "Unsupported calculation";

  // Handle the 'averageIf' condition
  if (calc.averageIf) {
    const { range, criteria, averageRange } = calc.averageIf;
    const criteriaValue = params.data[criteria];
    const valuesToAverage = rowData
      .filter((row) => row[range] === criteriaValue)
      .map((row) => row[averageRange]);

    const sum = valuesToAverage.reduce((acc, val) => acc + val, 0);
    console.log(3, calc, rowData, params);
    return valuesToAverage.length ? sum / valuesToAverage.length : 0;
  }

  return "hm";
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

export { CalculationTable, getColDefs };
