import * as Point from "../point";
import { PointSet } from "./point-set";
import {
  isFormulaValue,
  getReferences,
  extractFormula,
  FORMULA_VALUE_PREFIX,
  evaluate,
  createFormulaParser,
  createCCFormulaParser,
  Coord,
  evaluateCC,
} from "./formula";
import {
  CalcTableDefinition,
  PageData,
  RowData,
} from "../../model/tableDefinition";
import { createRef } from "react";
import { AgGridReact } from "@ag-grid-community/react";

const A1 = "A1";
const A2 = "A2";
const A1_POINT: Point.Point = { row: 0, column: 0 };
const A2_POINT: Point.Point = { row: 1, column: 0 };
const SUM_A1_A2_FORMULA = `SUM(${A1}, ${A2})`;
const EXAMPLE_FORMULA = "TRUE()";
const EXAMPLE_FORMULA_VALUE = `${FORMULA_VALUE_PREFIX}${EXAMPLE_FORMULA}`;

const mockMethod2_3Table1: CalcTableDefinition = new CalcTableDefinition(
  "Method2-3Table1",
  "mock",
  "mock",
  [],
  ["Method2-3RefTable"]
);

const mockMethod2_3RefTable: CalcTableDefinition = new CalcTableDefinition(
  "Method2-3RefTable",
  "mock",
  "mock",
  [],
  [],
  {
    C: "Method2-3Table1",
    D: "Method2-3Table1",
  }
);

class mockTable {
  constructor(public definition: CalcTableDefinition, public data: RowData[]) {}
}

const mockPageData = (fromTables: mockTable[]): PageData => {
  const pageData: PageData = {};
  fromTables.forEach((table) => {
    pageData[table.definition.tableId] = {
      ref: createRef<AgGridReact<any>>(),
      tableDefinition: table.definition,
      data: table.data,
    };
  });
  return pageData;
};

// Tests

describe("isFormulaValue()", () => {
  const cases = [
    ["formula value", EXAMPLE_FORMULA_VALUE, true],
    ["just equals", "=", false],
    ["non-formula value", "", false],
  ];
  test.each(cases)("%s", (name, formula, expected) => {
    expect(isFormulaValue(formula)).toBe(expected);
  });
});

describe("extractFormula()", () => {
  test("extracts formula from given cell value", () => {
    expect(extractFormula(EXAMPLE_FORMULA_VALUE)).toBe(EXAMPLE_FORMULA);
  });
});

describe("getReferences()", () => {
  test("gets simple references", () => {
    expect(
      getReferences(SUM_A1_A2_FORMULA, Point.ORIGIN, [
        [{ value: 1 }],
        [{ value: 2 }],
      ])
    ).toEqual(PointSet.from([A1_POINT, A2_POINT]));
  });
  test("gets range references", () => {
    const references = getReferences("SUM(A:A)", Point.ORIGIN, [
      [{ value: 1 }],
      [{ value: 2 }],
    ]);

    expect(references).toEqual(PointSet.from([A1_POINT, A2_POINT]));
  });
});

describe("evaluate()", () => {
  test("evaluates formula", () => {
    const formulaParser = createFormulaParser([]);
    expect(evaluate(EXAMPLE_FORMULA, Point.ORIGIN, formulaParser)).toBe(true);
  });
  test("evaluates sum formula", () => {
    const data = [[{ value: 1 }], [{ value: 2 }]];
    const formulaParser = createFormulaParser(data);
    expect(
      evaluate(SUM_A1_A2_FORMULA, { row: 1, column: 1 }, formulaParser)
    ).toBe(3);
  });
  /**
   * With the given data and the given equation for this column, do i get the expected value in colum P?
   * 
   * {
      "headerName": "[Es]\nAnnual natural gas emissions\n(scf)",
      "field": "P",
      "editable": false,
      "excelFormula": "=IF(OR($C$=\"\",$E$=\"\",$L$=\"\",$M$=\"\",$N$=\"\"),\"\",(($L$*((0.37*10^-3)*IF($E$=\"No\",($F$^2)*$G$*$H$,($I$^2)*$J$*$K$))+($L$*($M$*($N$-IF($E$=\"No\",1,0.5))*$O$)))))"
    }
   */
  test("evaluates Method2-3Table1.P formula", () => {
    testFormula(
      '=IF(OR($C$="",$E$="",$L$="",$M$="",$N$=""),"",(($L$*((0.37*10^-3)*IF($E$="No",($F$^2)*$G$*$H$,($I$^2)*$J$*$K$))+($L$*($M$*($N$-IF($E$="No",1,0.5))*$O$)))))',
      1,
      1330.08887,
      [
        new mockTable(mockMethod2_3Table1, [
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "11",
            E: "Yes",
            I: "11",
            J: "11",
            K: "11",
            L: "11",
            M: "11",
            O: 1,
            N: "11",
            P: 0,
          },
        ]),
      ]
    );
  });
});

const testFormula = (
  formula: string,
  row: number,
  toBe: any,
  fromTables: mockTable[]
) => {
  const pageData: PageData = mockPageData(fromTables);

  // const tableDefinition
  const formulaParser = createCCFormulaParser(
    fromTables[0].definition,
    pageData
  );
  expect(
    evaluateCC(
      formula,
      // { col: "P", row: 1, tableId: "Method2-3Table1" } as Coord,
      { row: row } as Coord,
      formulaParser
    )
  ).toBe(toBe);
};
