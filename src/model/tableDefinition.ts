import { CellStyle, ColDef, ValueGetterFunc } from "@ag-grid-community/core";
import {
  Calculations,
  Condition,
  IfCondition,
  AverageIf,
  instanceOfIfCondition,
  instanceOfExpressionNode,
  evaluateExpression,
  ExpressionNode,
} from "./calculations";
import { calculateExcelFormula } from "../utils/utils";
import FormulaParser from "fast-formula-parser";
import { columns, evaluate } from "../calc-engine/engine/formula";

export interface RowData {
  [key: string]: any; // TODO: come back to this
}

interface Params {
  data: RowData;
}

export type CalculationResult = string | number;

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

class StyleExpression {
  condition: string;
  style: CellStyle;

  constructor(condition: string, style: CellStyle) {
    this.condition = condition;
    this.style = style;
  }
}

interface ColumnDefinitions {
  headerName: string;
  field: string;
  editable: boolean;
  options?: string[] | null;
  cellStyleRules?: StyleRule[] | null;
  cellStyle?: StyleExpression | null;
  calculations?: Calculations | null;
  funcCall?: FuncCall | null;
}

class FuncCall {
  funcName: string;
  inputs: string[];

  constructor(funcName: string, inputs: string[]) {
    this.funcName = funcName;
    this.inputs = inputs;
  }
}

class ColumnDefinitions {
  headerName: string;
  field: string;
  editable: boolean;
  options?: string[] | null;
  cellStyleRules?: StyleRule[] | null;
  cellStyle?: StyleExpression | null;
  calculations?: Calculations | null;
  excelFormula?: string | null;

  constructor(
    headerName: string,
    field: string,
    editable: boolean,
    options?: string[] | null,
    cellStyle?: StyleExpression | null,
    cellStyleRules?: StyleRule[] | null,
    calculations?: Calculations | null,
    excelFormula?: string | null
  ) {
    this.headerName = headerName;
    this.field = field;
    this.editable = editable;
    this.options = options;
    this.cellStyle = cellStyle;
    this.cellStyleRules = cellStyleRules;
    this.calculations = calculations;
    this.excelFormula = excelFormula;
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
  rowData: RowData[],
  setRowData: (rowData: RowData[]) => void,
  fomulaParser: FormulaParser
): ColDef[] => {
  return columnDefinitions.map((cd) => ({
    headerName: cd.headerName,
    field: cd.field,
    editable: cd.editable,
    sortable: false,
    ...(cd.cellStyle
      ? {
          cellStyle: (params: any): CellStyle => {
            if (!cd.cellStyle) return {};
            const evaled = evaluate(
              cd.cellStyle.condition,
              {
                col: params.column.colId,
                row: params.node.rowIndex + 1,
              },
              fomulaParser
            );
            console.log("evaled?", evaled);
            if (evaled) {
              return cd.cellStyle.style;
            }
            return params.colDef.editable
              ? { backgroundColor: "lightgreen" }
              : { backgroundColor: "lightgray" };
          },
        }
      : {}),
    ...(cd.options
      ? {
          cellEditor: "agSelectCellEditor",
          cellEditorParams: { values: cd.options },
        }
      : {}),
    ...(cd.funcCall
      ? {
          valueGetter: (params: any) => {
            if (cd.funcCall) {
              return doFuncCall(params, cd.funcCall, rowData);
            }
          },
        }
      : {}),
    ...(cd.excelFormula
      ? {
          valueGetter: (params: any) => {
            console.log("params", columns.indexOf(params.column.colId) - 1);
            if (cd.excelFormula) {
              const evaled = evaluate(
                cd.excelFormula,
                {
                  col: params.column.colId,
                  row: params.node.rowIndex + 1,
                },
                fomulaParser
              );
              rowData[params.node.rowIndex][params.column.colId] = evaled;
              setRowData(rowData);
              return evaled;
            }
          },
        }
      : {}),
  }));
};

function doFuncCall(params: any, funcCall: FuncCall, rowData: RowData[]): any {
  const { funcName, inputs } = funcCall;
  switch (funcName) {
    case "calculateExcelFormula":
      const args = inputs.map((input) => params.data[input]) as [
        number,
        number
      ];
      return calculateExcelFormula(...args);
    // Add more cases if there are other functions to call
    default:
      throw new Error(`Function ${funcName} is not defined.`);
  }
}

function doCalculation(
  params: Params,
  calc: Calculations,
  rowData: RowData[]
): CalculationResult {
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

  function evaluateExpressionNode(
    params: Params,
    expressionNode: ExpressionNode,
    rowData: RowData[]
  ): CalculationResult {
    return evaluateExpression(expressionNode, params.data);
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
      if (instanceOfIfCondition(condition.then.if)) {
        return evaluateIfCondition(params, condition.then.if, rowData);
      } else if (instanceOfExpressionNode(condition.then)) {
        return evaluateExpressionNode(params, condition.then, rowData);
      }
      return condition.then.toString();
    } else {
      // Recursively evaluate if the 'else' part is another condition
      if (instanceOfIfCondition(condition.else.if)) {
        return evaluateIfCondition(params, condition.else.if, rowData);
      } else if (instanceOfExpressionNode(condition.else)) {
        return evaluateExpressionNode(params, condition.else, rowData);
      }
      return condition.else;
    }
  }

  // Evaluate the 'if' condition
  if (calc.if) {
    let test = evaluateIfCondition(params, calc.if, rowData);
    return JSON.stringify(test);
  }

  return "hm";
}

/**
 * aggregation
 * referencing another table
 * 
 * 
      "calculations": "a*c"
 */

export { CalculationTable, getColDefs };
