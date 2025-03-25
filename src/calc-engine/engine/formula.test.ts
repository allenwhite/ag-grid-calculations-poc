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

class FormulaTestCase {
  constructor(
    public formula: string,
    public row: number,
    public tableId: string,
    public expected: any,
    public fromTables: mockTable[]
  ) {}
}

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
const testFormula = (testCase: FormulaTestCase) => {
  const pageData: PageData = mockPageData(testCase.fromTables);
  // const tableDefinition
  const formulaParser = createCCFormulaParser(pageData);
  expect(
    evaluateCC(
      testCase.formula,
      // { col: "P", row: 1, tableId: "Method2-3Table1" } as Coord,
      {
        row: testCase.row,
        tableId: testCase.fromTables[0].definition.tableId,
      } as Coord,
      formulaParser
    )
  ).toBe(testCase.expected);
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
  const mockMethod2_3Table1: CalcTableDefinition = new CalcTableDefinition(
    "Method2-3Table1",
    "mock",
    "mock",
    [],
    ["Method2-3RefTable"],
    undefined
  );

  const mockMethod2_3Table2: CalcTableDefinition = new CalcTableDefinition(
    "Method2-3Table2",
    "mock",
    "mock",
    [],
    undefined,
    undefined
  );

  const mockMethod2_3RefTable: CalcTableDefinition = new CalcTableDefinition(
    "Method2-3RefTable",
    "mock",
    "mock",
    [],
    undefined,
    {
      YYY: { column: "C", tableId: "Method2-3Table1" },
      ZZZ: { column: "E", tableId: "Method2-3Table1" },
    }
  );

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
  test("evaluates Method2-3Table1.P formula", () => {
    const mockMethod2_3Table1: CalcTableDefinition = new CalcTableDefinition(
      "Method2-3Table1",
      "mock",
      "mock",
      [],
      ["Method2-3RefTable"]
    );

    testFormula({
      formula:
        '=IF(OR($C$="",$E$="",$L$="",$M$="",$N$=""),"",(($L$*((0.37*10^-3)*IF($E$="No",($F$^2)*$G$*$H$,($I$^2)*$J$*$K$))+($L$*($M$*($N$-IF($E$="No",1,0.5))*$O$)))))',
      row: 1,
      tableId: "Method2-3Table1",
      expected: 1330.08887,
      fromTables: [
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
      ],
    });
  });

  /// heres goes nothings/////////////////////////////////////////

  test("evaluates Method2-3Table1.O row 1 formula", () => {
    testFormula({
      formula:
        '=IF(OR($E$="",$N$=""),"",IF($E$="No",IF($N$<1,0,1),IF($N$<0.5,0,1)))',
      row: 1,
      tableId: "Method2-3Table1",
      expected: 1,
      fromTables: [
        new mockTable(mockMethod2_3Table1, [
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "11",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "11",
            J: "11",
            K: "11",
            L: "11",
            M: "11",
            N: "11",
            O: -999,
            P: 1330.08887,
            Q: 1330.08887,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "22",
            E: "No",
            F: "2",
            G: "2",
            H: "2",
            I: "",
            J: "",
            K: "",
            L: "2",
            M: "2",
            N: "2",
            O: 1,
            P: 4.01184,
            Q: 1334.10071,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "4",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "4",
            J: "4",
            K: "4",
            L: "4",
            M: "4",
            N: "4",
            O: 1,
            P: 56.37888,
            Q: 1390.47959,
          },
          {
            C: "200 - ESSEX, NY (31) - Shale gas",
            D: "7",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "7",
            J: "7",
            K: "7",
            L: "7",
            M: "7",
            N: "7",
            O: 1,
            P: 324.71859,
            Q: 1715.1981799999999,
          },
        ]),
        new mockTable(mockMethod2_3Table2, [
          {
            C: "",
            D: "",
            E: "",
            F: "",
            G: "",
            H: "",
            I: "",
            J: "",
            K: "",
            L: "",
            M: "",
            N: "",
            O: -999,
            P: -999,
          },
        ]),
        new mockTable(mockMethod2_3RefTable, [
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_No",
            AJ: "110 - ESSEX, NY (31) - Shale gas_No",
            AK: "",
          },
          { AI: "110 - ESSEX, NY (31) - Shale gas_Yes", AJ: "", AK: "" },
          {
            AI: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
        ]),
      ],
    });
  });

  test("evaluates Method2-3Table1.O row 2 formula", () => {
    testFormula({
      formula:
        '=IF(OR($E$="",$N$=""),"",IF($E$="No",IF($N$<1,0,1),IF($N$<0.5,0,1)))',
      row: 2,
      tableId: "Method2-3Table1",
      expected: 1,
      fromTables: [
        new mockTable(mockMethod2_3Table1, [
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "11",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "11",
            J: "11",
            K: "11",
            L: "11",
            M: "11",
            N: "11",
            O: 1,
            P: 1330.08887,
            Q: 1330.08887,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "22",
            E: "No",
            F: "2",
            G: "2",
            H: "2",
            I: "",
            J: "",
            K: "",
            L: "2",
            M: "2",
            N: "2",
            O: -999,
            P: 4.01184,
            Q: 1334.10071,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "4",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "4",
            J: "4",
            K: "4",
            L: "4",
            M: "4",
            N: "4",
            O: 1,
            P: 56.37888,
            Q: 1390.47959,
          },
          {
            C: "200 - ESSEX, NY (31) - Shale gas",
            D: "7",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "7",
            J: "7",
            K: "7",
            L: "7",
            M: "7",
            N: "7",
            O: 1,
            P: 324.71859,
            Q: 1715.1981799999999,
          },
        ]),
        new mockTable(mockMethod2_3Table2, [
          {
            C: "",
            D: "",
            E: "",
            F: "",
            G: "",
            H: "",
            I: "",
            J: "",
            K: "",
            L: "",
            M: "",
            N: "",
            O: -999,
            P: -999,
          },
        ]),
        new mockTable(mockMethod2_3RefTable, [
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_No",
            AJ: "110 - ESSEX, NY (31) - Shale gas_No",
            AK: "",
          },
          { AI: "110 - ESSEX, NY (31) - Shale gas_Yes", AJ: "", AK: "" },
          {
            AI: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
        ]),
      ],
    });
  });

  test("evaluates Method2-3Table1.O row 3 formula", () => {
    testFormula({
      formula:
        '=IF(OR($E$="",$N$=""),"",IF($E$="No",IF($N$<1,0,1),IF($N$<0.5,0,1)))',
      row: 3,
      tableId: "Method2-3Table1",
      expected: 1,
      fromTables: [
        new mockTable(mockMethod2_3Table1, [
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "11",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "11",
            J: "11",
            K: "11",
            L: "11",
            M: "11",
            N: "11",
            O: 1,
            P: 1330.08887,
            Q: 1330.08887,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "22",
            E: "No",
            F: "2",
            G: "2",
            H: "2",
            I: "",
            J: "",
            K: "",
            L: "2",
            M: "2",
            N: "2",
            O: 1,
            P: 4.01184,
            Q: 1334.10071,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "4",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "4",
            J: "4",
            K: "4",
            L: "4",
            M: "4",
            N: "4",
            O: -999,
            P: 56.37888,
            Q: 1390.47959,
          },
          {
            C: "200 - ESSEX, NY (31) - Shale gas",
            D: "7",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "7",
            J: "7",
            K: "7",
            L: "7",
            M: "7",
            N: "7",
            O: 1,
            P: 324.71859,
            Q: 1715.1981799999999,
          },
        ]),
        new mockTable(mockMethod2_3Table2, [
          {
            C: "",
            D: "",
            E: "",
            F: "",
            G: "",
            H: "",
            I: "",
            J: "",
            K: "",
            L: "",
            M: "",
            N: "",
            O: -999,
            P: -999,
          },
        ]),
        new mockTable(mockMethod2_3RefTable, [
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_No",
            AJ: "110 - ESSEX, NY (31) - Shale gas_No",
            AK: "",
          },
          { AI: "110 - ESSEX, NY (31) - Shale gas_Yes", AJ: "", AK: "" },
          {
            AI: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
        ]),
      ],
    });
  });

  test("evaluates Method2-3Table1.O row 4 formula", () => {
    testFormula({
      formula:
        '=IF(OR($E$="",$N$=""),"",IF($E$="No",IF($N$<1,0,1),IF($N$<0.5,0,1)))',
      row: 4,
      tableId: "Method2-3Table1",
      expected: 1,
      fromTables: [
        new mockTable(mockMethod2_3Table1, [
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "11",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "11",
            J: "11",
            K: "11",
            L: "11",
            M: "11",
            N: "11",
            O: 1,
            P: 1330.08887,
            Q: 1330.08887,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "22",
            E: "No",
            F: "2",
            G: "2",
            H: "2",
            I: "",
            J: "",
            K: "",
            L: "2",
            M: "2",
            N: "2",
            O: 1,
            P: 4.01184,
            Q: 1334.10071,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "4",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "4",
            J: "4",
            K: "4",
            L: "4",
            M: "4",
            N: "4",
            O: 1,
            P: 56.37888,
            Q: 1390.47959,
          },
          {
            C: "200 - ESSEX, NY (31) - Shale gas",
            D: "7",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "7",
            J: "7",
            K: "7",
            L: "7",
            M: "7",
            N: "7",
            O: -999,
            P: 324.71859,
            Q: 1715.1981799999999,
          },
        ]),
        new mockTable(mockMethod2_3Table2, [
          {
            C: "",
            D: "",
            E: "",
            F: "",
            G: "",
            H: "",
            I: "",
            J: "",
            K: "",
            L: "",
            M: "",
            N: "",
            O: -999,
            P: -999,
          },
        ]),
        new mockTable(mockMethod2_3RefTable, [
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_No",
            AJ: "110 - ESSEX, NY (31) - Shale gas_No",
            AK: "",
          },
          { AI: "110 - ESSEX, NY (31) - Shale gas_Yes", AJ: "", AK: "" },
          {
            AI: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
        ]),
      ],
    });
  });

  test("evaluates Method2-3Table1.P row 1 formula", () => {
    testFormula({
      formula:
        '=IF(OR($C$="",$E$="",$L$="",$M$="",$N$=""),"",(($L$*((0.37*10^-3)*IF($E$="No",($F$^2)*$G$*$H$,($I$^2)*$J$*$K$))+($L$*($M$*($N$-IF($E$="No",1,0.5))*$O$)))))',
      row: 1,
      tableId: "Method2-3Table1",
      expected: 1330.08887,
      fromTables: [
        new mockTable(mockMethod2_3Table1, [
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "11",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "11",
            J: "11",
            K: "11",
            L: "11",
            M: "11",
            N: "11",
            O: 1,
            P: -999,
            Q: 1330.08887,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "22",
            E: "No",
            F: "2",
            G: "2",
            H: "2",
            I: "",
            J: "",
            K: "",
            L: "2",
            M: "2",
            N: "2",
            O: 1,
            P: 4.01184,
            Q: 1334.10071,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "4",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "4",
            J: "4",
            K: "4",
            L: "4",
            M: "4",
            N: "4",
            O: 1,
            P: 56.37888,
            Q: 1390.47959,
          },
          {
            C: "200 - ESSEX, NY (31) - Shale gas",
            D: "7",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "7",
            J: "7",
            K: "7",
            L: "7",
            M: "7",
            N: "7",
            O: 1,
            P: 324.71859,
            Q: 1715.1981799999999,
          },
        ]),
        new mockTable(mockMethod2_3Table2, [
          {
            C: "",
            D: "",
            E: "",
            F: "",
            G: "",
            H: "",
            I: "",
            J: "",
            K: "",
            L: "",
            M: "",
            N: "",
            O: -999,
            P: -999,
          },
        ]),
        new mockTable(mockMethod2_3RefTable, [
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_No",
            AJ: "110 - ESSEX, NY (31) - Shale gas_No",
            AK: "",
          },
          { AI: "110 - ESSEX, NY (31) - Shale gas_Yes", AJ: "", AK: "" },
          {
            AI: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
        ]),
      ],
    });
  });

  test("evaluates Method2-3Table1.P row 2 formula", () => {
    testFormula({
      formula:
        '=IF(OR($C$="",$E$="",$L$="",$M$="",$N$=""),"",(($L$*((0.37*10^-3)*IF($E$="No",($F$^2)*$G$*$H$,($I$^2)*$J$*$K$))+($L$*($M$*($N$-IF($E$="No",1,0.5))*$O$)))))',
      row: 2,
      tableId: "Method2-3Table1",
      expected: 4.01184,
      fromTables: [
        new mockTable(mockMethod2_3Table1, [
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "11",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "11",
            J: "11",
            K: "11",
            L: "11",
            M: "11",
            N: "11",
            O: 1,
            P: 1330.08887,
            Q: 1330.08887,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "22",
            E: "No",
            F: "2",
            G: "2",
            H: "2",
            I: "",
            J: "",
            K: "",
            L: "2",
            M: "2",
            N: "2",
            O: 1,
            P: -999,
            Q: 1334.10071,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "4",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "4",
            J: "4",
            K: "4",
            L: "4",
            M: "4",
            N: "4",
            O: 1,
            P: 56.37888,
            Q: 1390.47959,
          },
          {
            C: "200 - ESSEX, NY (31) - Shale gas",
            D: "7",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "7",
            J: "7",
            K: "7",
            L: "7",
            M: "7",
            N: "7",
            O: 1,
            P: 324.71859,
            Q: 1715.1981799999999,
          },
        ]),
        new mockTable(mockMethod2_3Table2, [
          {
            C: "",
            D: "",
            E: "",
            F: "",
            G: "",
            H: "",
            I: "",
            J: "",
            K: "",
            L: "",
            M: "",
            N: "",
            O: -999,
            P: -999,
          },
        ]),
        new mockTable(mockMethod2_3RefTable, [
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_No",
            AJ: "110 - ESSEX, NY (31) - Shale gas_No",
            AK: "",
          },
          { AI: "110 - ESSEX, NY (31) - Shale gas_Yes", AJ: "", AK: "" },
          {
            AI: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
        ]),
      ],
    });
  });

  test("evaluates Method2-3Table1.P row 3 formula", () => {
    testFormula({
      formula:
        '=IF(OR($C$="",$E$="",$L$="",$M$="",$N$=""),"",(($L$*((0.37*10^-3)*IF($E$="No",($F$^2)*$G$*$H$,($I$^2)*$J$*$K$))+($L$*($M$*($N$-IF($E$="No",1,0.5))*$O$)))))',
      row: 3,
      tableId: "Method2-3Table1",
      expected: 56.37888,
      fromTables: [
        new mockTable(mockMethod2_3Table1, [
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "11",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "11",
            J: "11",
            K: "11",
            L: "11",
            M: "11",
            N: "11",
            O: 1,
            P: 1330.08887,
            Q: 1330.08887,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "22",
            E: "No",
            F: "2",
            G: "2",
            H: "2",
            I: "",
            J: "",
            K: "",
            L: "2",
            M: "2",
            N: "2",
            O: 1,
            P: 4.01184,
            Q: 1334.10071,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "4",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "4",
            J: "4",
            K: "4",
            L: "4",
            M: "4",
            N: "4",
            O: 1,
            P: -999,
            Q: 1390.47959,
          },
          {
            C: "200 - ESSEX, NY (31) - Shale gas",
            D: "7",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "7",
            J: "7",
            K: "7",
            L: "7",
            M: "7",
            N: "7",
            O: 1,
            P: 324.71859,
            Q: 1715.1981799999999,
          },
        ]),
        new mockTable(mockMethod2_3Table2, [
          {
            C: "",
            D: "",
            E: "",
            F: "",
            G: "",
            H: "",
            I: "",
            J: "",
            K: "",
            L: "",
            M: "",
            N: "",
            O: -999,
            P: -999,
          },
        ]),
        new mockTable(mockMethod2_3RefTable, [
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_No",
            AJ: "110 - ESSEX, NY (31) - Shale gas_No",
            AK: "",
          },
          { AI: "110 - ESSEX, NY (31) - Shale gas_Yes", AJ: "", AK: "" },
          {
            AI: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
        ]),
      ],
    });
  });

  test("evaluates Method2-3Table1.P row 4 formula", () => {
    testFormula({
      formula:
        '=IF(OR($C$="",$E$="",$L$="",$M$="",$N$=""),"",(($L$*((0.37*10^-3)*IF($E$="No",($F$^2)*$G$*$H$,($I$^2)*$J$*$K$))+($L$*($M$*($N$-IF($E$="No",1,0.5))*$O$)))))',
      row: 4,
      tableId: "Method2-3Table1",
      expected: 324.71859,
      fromTables: [
        new mockTable(mockMethod2_3Table1, [
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "11",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "11",
            J: "11",
            K: "11",
            L: "11",
            M: "11",
            N: "11",
            O: 1,
            P: 1330.08887,
            Q: 1330.08887,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "22",
            E: "No",
            F: "2",
            G: "2",
            H: "2",
            I: "",
            J: "",
            K: "",
            L: "2",
            M: "2",
            N: "2",
            O: 1,
            P: 4.01184,
            Q: 1334.10071,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "4",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "4",
            J: "4",
            K: "4",
            L: "4",
            M: "4",
            N: "4",
            O: 1,
            P: 56.37888,
            Q: 1390.47959,
          },
          {
            C: "200 - ESSEX, NY (31) - Shale gas",
            D: "7",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "7",
            J: "7",
            K: "7",
            L: "7",
            M: "7",
            N: "7",
            O: 1,
            P: -999,
            Q: 1715.1981799999999,
          },
        ]),
        new mockTable(mockMethod2_3Table2, [
          {
            C: "",
            D: "",
            E: "",
            F: "",
            G: "",
            H: "",
            I: "",
            J: "",
            K: "",
            L: "",
            M: "",
            N: "",
            O: -999,
            P: -999,
          },
        ]),
        new mockTable(mockMethod2_3RefTable, [
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_No",
            AJ: "110 - ESSEX, NY (31) - Shale gas_No",
            AK: "",
          },
          { AI: "110 - ESSEX, NY (31) - Shale gas_Yes", AJ: "", AK: "" },
          {
            AI: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
        ]),
      ],
    });
  });

  test("evaluates Method2-3Table1.Q row 1 formula", () => {
    testFormula({
      formula: "=SUM(P1:$P$)",
      row: 1,
      tableId: "Method2-3Table1",
      expected: 1330.08887,
      fromTables: [
        new mockTable(mockMethod2_3Table1, [
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "11",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "11",
            J: "11",
            K: "11",
            L: "11",
            M: "11",
            N: "11",
            O: 1,
            P: 1330.08887,
            Q: -999,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "22",
            E: "No",
            F: "2",
            G: "2",
            H: "2",
            I: "",
            J: "",
            K: "",
            L: "2",
            M: "2",
            N: "2",
            O: 1,
            P: 4.01184,
            Q: 1334.10071,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "4",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "4",
            J: "4",
            K: "4",
            L: "4",
            M: "4",
            N: "4",
            O: 1,
            P: 56.37888,
            Q: 1390.47959,
          },
          {
            C: "200 - ESSEX, NY (31) - Shale gas",
            D: "7",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "7",
            J: "7",
            K: "7",
            L: "7",
            M: "7",
            N: "7",
            O: 1,
            P: 324.71859,
            Q: 1715.1981799999999,
          },
        ]),
        new mockTable(mockMethod2_3Table2, [
          {
            C: "",
            D: "",
            E: "",
            F: "",
            G: "",
            H: "",
            I: "",
            J: "",
            K: "",
            L: "",
            M: "",
            N: "",
            O: -999,
            P: -999,
          },
        ]),
        new mockTable(mockMethod2_3RefTable, [
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_No",
            AJ: "110 - ESSEX, NY (31) - Shale gas_No",
            AK: "",
          },
          { AI: "110 - ESSEX, NY (31) - Shale gas_Yes", AJ: "", AK: "" },
          {
            AI: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
        ]),
      ],
    });
  });

  test("evaluates Method2-3Table1.Q row 2 formula", () => {
    testFormula({
      formula: "=SUM(P1:$P$)",
      row: 2,
      tableId: "Method2-3Table1",
      expected: 1334.10071,
      fromTables: [
        new mockTable(mockMethod2_3Table1, [
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "11",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "11",
            J: "11",
            K: "11",
            L: "11",
            M: "11",
            N: "11",
            O: 1,
            P: 1330.08887,
            Q: 1330.08887,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "22",
            E: "No",
            F: "2",
            G: "2",
            H: "2",
            I: "",
            J: "",
            K: "",
            L: "2",
            M: "2",
            N: "2",
            O: 1,
            P: 4.01184,
            Q: -999,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "4",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "4",
            J: "4",
            K: "4",
            L: "4",
            M: "4",
            N: "4",
            O: 1,
            P: 56.37888,
            Q: 1390.47959,
          },
          {
            C: "200 - ESSEX, NY (31) - Shale gas",
            D: "7",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "7",
            J: "7",
            K: "7",
            L: "7",
            M: "7",
            N: "7",
            O: 1,
            P: 324.71859,
            Q: 1715.1981799999999,
          },
        ]),
        new mockTable(mockMethod2_3Table2, [
          {
            C: "",
            D: "",
            E: "",
            F: "",
            G: "",
            H: "",
            I: "",
            J: "",
            K: "",
            L: "",
            M: "",
            N: "",
            O: -999,
            P: -999,
          },
        ]),
        new mockTable(mockMethod2_3RefTable, [
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_No",
            AJ: "110 - ESSEX, NY (31) - Shale gas_No",
            AK: "",
          },
          { AI: "110 - ESSEX, NY (31) - Shale gas_Yes", AJ: "", AK: "" },
          {
            AI: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
        ]),
      ],
    });
  });

  test("evaluates Method2-3Table1.Q row 3 formula", () => {
    testFormula({
      formula: "=SUM(P1:$P$)",
      row: 3,
      tableId: "Method2-3Table1",
      expected: 1390.47959,
      fromTables: [
        new mockTable(mockMethod2_3Table1, [
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "11",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "11",
            J: "11",
            K: "11",
            L: "11",
            M: "11",
            N: "11",
            O: 1,
            P: 1330.08887,
            Q: 1330.08887,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "22",
            E: "No",
            F: "2",
            G: "2",
            H: "2",
            I: "",
            J: "",
            K: "",
            L: "2",
            M: "2",
            N: "2",
            O: 1,
            P: 4.01184,
            Q: 1334.10071,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "4",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "4",
            J: "4",
            K: "4",
            L: "4",
            M: "4",
            N: "4",
            O: 1,
            P: 56.37888,
            Q: -999,
          },
          {
            C: "200 - ESSEX, NY (31) - Shale gas",
            D: "7",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "7",
            J: "7",
            K: "7",
            L: "7",
            M: "7",
            N: "7",
            O: 1,
            P: 324.71859,
            Q: 1715.1981799999999,
          },
        ]),
        new mockTable(mockMethod2_3Table2, [
          {
            C: "",
            D: "",
            E: "",
            F: "",
            G: "",
            H: "",
            I: "",
            J: "",
            K: "",
            L: "",
            M: "",
            N: "",
            O: -999,
            P: -999,
          },
        ]),
        new mockTable(mockMethod2_3RefTable, [
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_No",
            AJ: "110 - ESSEX, NY (31) - Shale gas_No",
            AK: "",
          },
          { AI: "110 - ESSEX, NY (31) - Shale gas_Yes", AJ: "", AK: "" },
          {
            AI: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
        ]),
      ],
    });
  });

  test("evaluates Method2-3Table1.Q row 4 formula", () => {
    testFormula({
      formula: "=SUM(P1:$P$)",
      row: 4,
      tableId: "Method2-3Table1",
      expected: 1715.1981799999999,
      fromTables: [
        new mockTable(mockMethod2_3Table1, [
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "11",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "11",
            J: "11",
            K: "11",
            L: "11",
            M: "11",
            N: "11",
            O: 1,
            P: 1330.08887,
            Q: 1330.08887,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "22",
            E: "No",
            F: "2",
            G: "2",
            H: "2",
            I: "",
            J: "",
            K: "",
            L: "2",
            M: "2",
            N: "2",
            O: 1,
            P: 4.01184,
            Q: 1334.10071,
          },
          {
            C: "110 - ESSEX, NY (31) - Shale gas",
            D: "4",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "4",
            J: "4",
            K: "4",
            L: "4",
            M: "4",
            N: "4",
            O: 1,
            P: 56.37888,
            Q: 1390.47959,
          },
          {
            C: "200 - ESSEX, NY (31) - Shale gas",
            D: "7",
            E: "Yes",
            F: "",
            G: "",
            H: "",
            I: "7",
            J: "7",
            K: "7",
            L: "7",
            M: "7",
            N: "7",
            O: 1,
            P: 324.71859,
            Q: -999,
          },
        ]),
        new mockTable(mockMethod2_3Table2, [
          {
            C: "",
            D: "",
            E: "",
            F: "",
            G: "",
            H: "",
            I: "",
            J: "",
            K: "",
            L: "",
            M: "",
            N: "",
            O: -999,
            P: -999,
          },
        ]),
        new mockTable(mockMethod2_3RefTable, [
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "110 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
          {
            AI: "110 - ESSEX, NY (31) - Shale gas_No",
            AJ: "110 - ESSEX, NY (31) - Shale gas_No",
            AK: "",
          },
          { AI: "110 - ESSEX, NY (31) - Shale gas_Yes", AJ: "", AK: "" },
          {
            AI: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AJ: "200 - ESSEX, NY (31) - Shale gas_Yes",
            AK: "",
          },
        ]),
      ],
    });
  });

  // /////////////////////////////////////
});
