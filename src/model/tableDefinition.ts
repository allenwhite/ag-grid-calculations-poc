import { CellStyle, ColDef } from "@ag-grid-community/core";
import { calculateExcelFormula } from "../utils/utils";
import FormulaParser, { Value } from "fast-formula-parser";
import { evaluateCC, parse } from "../calc-engine/engine/formula";
import { AgGridReact } from "@ag-grid-community/react";

const PRINT_TESTS_TO_CONSOLE = false;

export interface RowData {
  [key: string]: any; // TODO: come back to this, could probably be Value
}

export type TableData = {
  ref: React.RefObject<AgGridReact<any> | null> | null;
  tableDefinition: CalcTableDefinition;
  data: RowData[];
};

export type PageData = Record<string, TableData>;

export function addRowFor(pageData: PageData, tableIds: string[]): PageData {
  const updatedData = { ...pageData };
  tableIds.forEach((tableId) => {
    updatedData[tableId] = {
      ...updatedData[tableId],
      data: [
        ...updatedData[tableId].data,
        updatedData[tableId].tableDefinition.emptyRowData,
      ],
    };
  });
  return updatedData;
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
  dependentTables?: string[];
  externalRefs?: { [key: string]: ExternalRef } | null;
}

interface LookupTableJSON {
  tableId: string;
  columnDefinitions: ColumnDefinitions[];
  lookups: Record<string, any>[];
}

class ExternalRef {
  constructor(
    public column: string,
    public tableId: string,
    public row?: number | null | undefined
  ) {}
}

class CalcTableDefinition {
  constructor(
    public tableId: string,
    public description: string,
    public type: string,
    public columnDefinitions: ColumnDefinitions[],
    public dependentTables?: string[],
    public externalRefs?: { [key: string]: ExternalRef } | null
  ) {}

  static fromJson(json: CalcTableJSON): CalcTableDefinition {
    return new CalcTableDefinition(
      json.tableId,
      json.description,
      json.type,
      json.columnDefinitions,
      json.dependentTables,
      json.externalRefs
    );
  }

  static fromLookupJSON(json: LookupTableJSON): CalcTableDefinition {
    return new CalcTableDefinition(
      json.tableId,
      "",
      "",
      json.columnDefinitions
    );
  }

  get emptyRowData(): Record<string, any> {
    return this.columnDefinitions.reduce<Record<string, any>>((acc, cd) => {
      acc[cd.field] = "";
      return acc;
    }, {});
  }

  getColDefs(
    pageData: PageData,
    setPageData: (pageData: PageData) => void,
    fomulaParser: FormulaParser
  ): ColDef[] {
    this.printTestVariables(pageData);
    return this.columnDefinitions.map((cd) => ({
      headerName: cd.headerName,
      field: cd.field,
      editable: cd.editable,
      sortable: false,
      ...(cd.cellStyle
        ? {
            cellStyle: (params: any): CellStyle => {
              if (!cd.cellStyle) return {};
              const coord = {
                col: params.column.colId,
                row: params.node.rowIndex + 1,
                tableId: this.tableId,
              };
              const parsedFormula = parse(
                pageData,
                cd.cellStyle.condition,
                coord
              );
              const evaled = evaluateCC(parsedFormula, coord, fomulaParser);
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
                return doFuncCall(
                  params,
                  cd.funcCall,
                  pageData[this.tableId].data
                );
              }
            },
          }
        : {}),
      ...(cd.excelFormula
        ? {
            valueGetter: (params: any) => {
              // console.log("params", columns.indexOf(params.column.colId) - 1);
              if (cd.excelFormula) {
                const coord = {
                  col: params.column.colId,
                  row: params.node.rowIndex + 1,
                  tableId: this.tableId,
                };
                const parsedFormula = parse(pageData, cd.excelFormula, coord);
                const evaled = evaluateCC(parsedFormula, coord, fomulaParser);
                this.printTest(pageData, cd.excelFormula, params, evaled);
                // this little oneliner is working to keep things updated,
                // but its likely we would need a setRowData useState type completion,
                // or the angular equivalent.
                pageData[this.tableId].data[params.node.rowIndex][
                  params.column.colId
                ] = evaled;
                setPageData(pageData);
                // console.log("evaled", pageData);
                return evaled;
              }
            },
          }
        : {}),
    }));
  }

  printTestVariables(pageData: PageData) {
    if (!PRINT_TESTS_TO_CONSOLE) return;
    console.log(
      `${Object.values(pageData)
        .map(
          (tableData) =>
            `
            const mock${tableData.tableDefinition.tableId.replace(
              "-",
              "_"
            )}: CalcTableDefinition = new CalcTableDefinition(
              "${tableData.tableDefinition.tableId}",
              "mock",
              "mock",
              [],
              ${JSON.stringify(tableData.tableDefinition.dependentTables)},
              ${JSON.stringify(tableData.tableDefinition.externalRefs)}
            );
          `
        )
        .join("\n")}`
    );
  }

  printTest(
    pageData: PageData,
    excelFormula: string,
    params: any,
    evaled: Value
  ) {
    if (!PRINT_TESTS_TO_CONSOLE) return;
    // sometimes the correct answer is already there, this just ensures it isnt. probably not necessary
    const replaceTestData = (tableData: RowData[]): RowData[] => {
      let copy = tableData;
      if (
        params.node.rowIndex in copy &&
        params.column.colId in copy[params.node.rowIndex]
      ) {
        copy[params.node.rowIndex][params.column.colId] =
          typeof evaled === "string" ? "" : -999;
      }
      return copy;
    };
    console.log(
      `
      test("evaluates ${this.tableId}.${params.column.colId} row ${
        params.node.rowIndex + 1
      } formula", () => {
        testFormula({
          formula: '${excelFormula}',
          row: ${params.node.rowIndex + 1},
          tableId: "${this.tableId}",
          expected: ${typeof evaled === "string" ? `"${evaled}"` : evaled},
          fromTables: [\n${Object.values(pageData)
            .map(
              (tableData) =>
                `new mockTable(mock${tableData.tableDefinition.tableId.replace(
                  "-",
                  "_"
                )}, ${JSON.stringify(replaceTestData(tableData.data))})`
            )
            .join(",\n")}
          ],
        });
      });
      `
    );
  }
}

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

export { CalcTableDefinition };
