import * as Point from "../point";
import {
  isFormulaValue,
  extractFormula,
  FORMULA_VALUE_PREFIX,
  evaluate,
  createFormulaParser,
  Coord,
} from "./formula";

const EXAMPLE_FORMULA = "TRUE()";
const EXAMPLE_FORMULA_VALUE = `${FORMULA_VALUE_PREFIX}${EXAMPLE_FORMULA}`;

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
  // test("gets simple references", () => {
  //   expect(
  //     getReferences(SUM_A1_A2_FORMULA, Point.ORIGIN, [
  //       [{ value: 1 }],
  //       [{ value: 2 }],
  //     ])
  //   ).toEqual(PointSet.from([A1_POINT, A2_POINT]));
  // });
  // test("gets range references", () => {
  //   const references = getReferences("SUM(A:A)", Point.ORIGIN, [
  //     [{ value: 1 }],
  //     [{ value: 2 }],
  //   ]);
  //   expect(references).toEqual(PointSet.from([A1_POINT, A2_POINT]));
  // });
});

describe("evaluate()", () => {
  test("evaluates formula", () => {
    const formulaParser = createFormulaParser([]);
    expect(evaluate(EXAMPLE_FORMULA, Point.ORIGIN, formulaParser)).toBe(true);
  });
  test("evaluates sum formula", () => {
    // const data = [[{ value: 1 }], [{ value: 2 }]];
    // const formulaParser = createFormulaParser(data);
    // expect(
    //   evaluate(SUM_A1_A2_FORMULA, { row: 1, column: 1 }, formulaParser)
    // ).toBe(3);
  });
  test("evaluates Method2-3Table1.P formula", () => {
    const data = [
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
        P: 1330.08887,
      },
    ];

    const formulaParser = createFormulaParser(data);
    expect(
      evaluate(
        '=IF(OR($C$="",$E$="",$L$="",$M$="",$N$=""),"",(($L$*((0.37*10^-3)*IF($E$="No",($F$^2)*$G$*$H$,($I$^2)*$J$*$K$))+($L$*($M$*($N$-IF($E$="No",1,0.5))*$O$)))))',
        { col: "P", row: 1 } as Coord,
        formulaParser
      )
    ).toBe(1330.08887);
  });
});
