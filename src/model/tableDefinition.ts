import { CellStyle, ColDef } from "@ag-grid-community/core";
import { calculateExcelFormula } from "../utils/utils";
import FormulaParser from "fast-formula-parser";
import { evaluateCC } from "../calc-engine/engine/formula";

export interface RowData {
  [key: string]: any; // TODO: come back to this
}

export type CalculationResult = string | number;

class StyleExpression {
  constructor(public condition: string, public style: CellStyle) {}
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
  constructor(
    public headerName: string,
    public field: string,
    public editable: boolean,
    public options?: string[] | null,
    public cellStyle?: StyleExpression | null,
    public excelFormula?: string | null,
    public funcCall?: FuncCall | null
  ) {}
}

interface CalcTableJSON {
  tableId: string;
  description: string;
  type: string;
  columnDefinitions: ColumnDefinitions[];
  externalRefs?: { [key: string]: string } | null;
}

class CalcTableDefinition {
  constructor(
    public tableId: string,
    public description: string,
    public type: string,
    public columnDefinitions: ColumnDefinitions[],
    public externalRefs?: { [key: string]: string } | null
  ) {}

  static fromJson(json: CalcTableJSON): CalcTableDefinition {
    return new CalcTableDefinition(
      json.tableId,
      json.description,
      json.type,
      json.columnDefinitions,
      json.externalRefs
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
