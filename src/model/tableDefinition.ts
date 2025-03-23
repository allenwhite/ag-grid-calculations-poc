import { CellStyle, ColDef } from "@ag-grid-community/core";
import { Calculations } from "./calculations";
import { calculateExcelFormula } from "../utils/utils";
import FormulaParser from "fast-formula-parser";
import { columns, evaluate, evaluateCC } from "../calc-engine/engine/formula";

export interface RowData {
  [key: string]: any; // TODO: come back to this
}

interface Params {
  data: RowData;
}

export type CalculationResult = string | number;

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

interface CalcTableJSON {
  tableId: string;
  description: string;
  columnDefinitions: ColumnDefinitions[];
}

class CalcTableDefinition {
  tableId: string;
  description: string;
  columnDefinitions: ColumnDefinitions[];

  constructor(
    tableId: string,
    description: string,
    columnDefinitions: ColumnDefinitions[]
  ) {
    this.tableId = tableId;
    this.description = description;
    this.columnDefinitions = columnDefinitions;
  }

  static fromJson(json: CalcTableJSON): CalcTableDefinition {
    return new CalcTableDefinition(
      json.tableId,
      json.description,
      json.columnDefinitions
    );
  }

  get emptyRowData(): Record<string, any> {
    return this.columnDefinitions.reduce<Record<string, any>>((acc, cd) => {
      acc[cd.field] = "";
      return acc;
    }, {});
  }
}

const getColDefs = (
  tableDefinition: CalcTableDefinition,
  rowData: RowData[],
  setRowData: (rowData: RowData[]) => void,
  fomulaParser: FormulaParser
): ColDef[] => {
  return tableDefinition.columnDefinitions.map((cd) => ({
    headerName: cd.headerName,
    field: cd.field,
    editable: cd.editable,
    sortable: false,
    ...(cd.cellStyle
      ? {
          cellStyle: (params: any): CellStyle => {
            if (!cd.cellStyle) return {};
            const evaled = evaluateCC(
              cd.cellStyle.condition,
              {
                col: params.column.colId,
                row: params.node.rowIndex + 1,
                tableId: tableDefinition.tableId,
              },
              fomulaParser
            );
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
            // console.log("params", columns.indexOf(params.column.colId) - 1);
            if (cd.excelFormula) {
              const evaled = evaluateCC(
                cd.excelFormula,
                {
                  col: params.column.colId,
                  row: params.node.rowIndex + 1,
                  tableId: tableDefinition.tableId,
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

export { CalcTableDefinition, getColDefs };
