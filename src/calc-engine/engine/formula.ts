import FormulaParser, {
  CellRef,
  DepParser,
  FormulaError,
  FormulaParserConfig,
  Value,
} from "fast-formula-parser";
import { PointRange } from "../model/point-range";
import { Point } from "../model/point";
import * as Matrix from "../model/matrix";
import { CellBase } from "../model/types";
import { PointSet } from "./point-set";
import { PageData } from "../../model/tableDefinition";
import customFunctions from "./customFormulas";

export const FORMULA_VALUE_PREFIX = "=";

export const columns = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "AA",
  "AB",
  "AC",
  "AD",
  "AE",
  "AF",
  "AG",
  "AH",
  "AI",
  "AJ",
  "AK",
  "AL",
  "AM",
  "AN",
  "AO",
  "AP",
  "AQ",
  "AR",
  "AS",
  "AT",
  "AU",
  "AV",
  "AW",
  "AX",
  "AY",
  "AZ",
  "BA",
];

/** Returns whether given value is a formula */
export function isFormulaValue(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(FORMULA_VALUE_PREFIX) &&
    value.length > 1
  );
}

/** Extracts formula from value  */
export function extractFormula(value: string): string {
  return value.slice(1);
}

export function convertStartDataToDataSingle(data: any[]): {
  [key: string]: any[];
} {
  return Object.fromEntries(data.map((row, index) => [index, row]));
}

export function convertStartDataToData(pageData: PageData): {
  [key: string]: any[];
} {
  const result: { [key: string]: any[] } = {};
  Object.keys(pageData).forEach((key) => {
    result[key] = Object.values(pageData[key]);
  });
  return result;
}

export function createFormulaParser(
  data: Matrix.Matrix<CellBase>,
  config?: Omit<FormulaParserConfig, "onCell" | "onRange">
): FormulaParser {
  return new FormulaParser({
    ...config,
    onCell: (ref) => {
      const point: Point = {
        row: ref.row - 1,
        column: ref.col - 1,
      };
      const cell = Matrix.get(point, data);
      if (!isNaN(cell?.value as number)) return Number(cell?.value);
      return cell?.value;
    },
    onRange: (ref) => {
      const size = Matrix.getSize(data);
      const start: Point = {
        row: ref.from.row - 1,
        column: ref.from.col - 1,
      };
      const end: Point = {
        row: Math.min(ref.to.row - 1, size.rows - 1),
        column: Math.min(ref.to.col - 1, size.columns - 1),
      };
      const dataSlice = Matrix.slice(start, end, data);
      return Matrix.toArray(dataSlice, (cell) => {
        if (!isNaN(cell?.value as number)) return Number(cell?.value);
        return cell?.value;
      });
    },
  });
}

export function createCCFormulaParser(
  pageData: PageData,
  config?: Omit<FormulaParserConfig, "onCell" | "onRange">
): FormulaParser {
  return new FormulaParser({
    ...config,
    onCell: (ref: CellRef) => {
      if (ref.address === "$D$26") return 0.0526;
      const currentTableId = ref.sheet;
      let column = ref.address?.replaceAll("$", "").replace(/[0-9]/g, "");
      let row = ref.row - 1;
      let tableId = currentTableId;
      const externalRefs =
        pageData[currentTableId]?.tableDefinition?.externalRefs ?? {};
      if (column && Object.keys(externalRefs).includes(column)) {
        tableId = externalRefs[column]?.tableId;
        row = externalRefs[column]?.row ?? row;
        column = externalRefs[column]?.column;
      }

      const val = column
        ? pageData[tableId].data[row][column]
        : pageData[tableId].data[row][columns[ref.col - 1]];

      // if (currentTableId === "Method2-3Table2") {
      //   console.log(
      //     "val",
      //     val,
      //     "column",
      //     column,
      //     "tableId",
      //     tableId,
      //     "ref",
      //     ref,
      //     "externalRefs",
      //     externalRefs,
      //     "pageData",
      //     pageData
      //   );
      // }
      if (isNumeric(val)) return Number(val);
      if (val?.toString()?.length === 0) return 0;
      return val;
    },
    onRange: (ref) => {
      const currentTableId = ref.sheet;
      const arr: Value[] = [];
      const rowMax = Math.min(ref.to.row, pageData[currentTableId].data.length);
      for (let row = ref.from.row; row <= rowMax; row++) {
        const innerArr = [];
        if (pageData[currentTableId].data[row - 1]) {
          for (let col = ref.from.col; col <= ref.to.col; col++) {
            // console.log(
            //   "onRangePush",
            //   pageData,
            //   "currentTableId",
            //   currentTableId,
            //   "pageData[currentTableId]",
            //   pageData[currentTableId],
            //   "data?",
            //   pageData[currentTableId].data,
            //   "row",
            //   row,
            //   "pageData[currentTableId].data[row - 1]",
            //   pageData[currentTableId].data[row - 1],
            //   "col",
            //   columns[col - 1],
            //   "pageData[currentTableId].data[row - 1][columns[col - 1]]",
            //   pageData[currentTableId].data[row - 1][columns[col - 1]],
            //   "?",
            //   Object.keys(pageData[currentTableId].data[row - 1]).map((key) => {
            //     return pageData[currentTableId].data[row - 1][key];
            //   })
            // );
            innerArr.push(
              pageData[currentTableId].data[row - 1][columns[col - 1]]
            );
          }
        }
        arr.push(innerArr);
      }
      // if (currentTableId === "Method2_3Table1") {
      // this is just not initially updating for some reason, but it does after a hot reload
      // console.log(
      //   "onRange: arr",
      //   arr,
      //   "ref",
      //   ref,
      //   "pageData",
      //   pageData,
      //   ref.from.address
      // );
      // }
      return arr as Value[];
    },
    functions: customFunctions(pageData),
  });
}

const depParser = new DepParser();

/**
 * For given formula returns the cell references
 * @param formula - formula to get references for
 */
export function getReferences(
  formula: string,
  point: Point,
  data: Matrix.Matrix<CellBase>
): PointSet {
  const { rows, columns } = Matrix.getSize(data);
  try {
    const dependencies = depParser.parse(formula, convertPointToCellRef(point));

    const references = PointSet.from(
      dependencies.flatMap((reference) => {
        const isRange = "from" in reference;
        if (isRange) {
          const { from, to } = reference;

          const normalizedFrom: Point = {
            row: from.row - 1,
            column: from.col - 1,
          };

          const normalizedTo: Point = {
            row: Math.min(to.row - 1, rows - 1),
            column: Math.min(to.col - 1, columns - 1),
          };

          const range = new PointRange(normalizedFrom, normalizedTo);

          return Array.from(range);
        }
        return { row: reference.row - 1, column: reference.col - 1 };
      })
    );

    return references;
  } catch (error) {
    if (error instanceof FormulaError) {
      return PointSet.from([]);
    } else {
      throw error;
    }
  }
}

/**
 * Replaces ranges in formula with the current row
 * $N$ => $N1
 *
 * @param formula - formula to parse
 * @param currentPosition - current cell position
 * @returns
 */
export const replaceRanges = (
  pageData: PageData,
  formula: string,
  currentPosition: Coord
): string => {
  const currentExternalRefs =
    pageData[currentPosition.tableId].tableDefinition.externalRefs;
  const parsed = formula
    .replace(FORMULA_VALUE_PREFIX, "")
    .replaceAll(/\$([A-Za-z]+)\$(?!\d)/g, (match, p1) => {
      if (currentExternalRefs && currentExternalRefs[p1]) {
        const column = currentExternalRefs[p1].column;
        const externalRow = currentExternalRefs[p1].row;
        const tableId = currentExternalRefs[p1].tableId;

        let row: number | string = currentPosition.row;
        if (externalRow === null) {
          row = "";
        } else if (externalRow !== undefined) {
          row = externalRow;
        }

        return `${tableId}!${column}${row}`;
      }
      return `$${p1}${currentPosition.row}`;
    });
  if (currentPosition.tableId === "Method2_3Table2") {
    console.log("replaceRanges", formula, "parsed", parsed);
  }
  return parsed;
};

export class Coord {
  constructor(public row: number, public col: string, public tableId: string) {}
}

export function evaluateCC(
  formula: string,
  coord: Coord,
  formulaParser: FormulaParser
): Value {
  // const parsedFormula = replaceRanges(formula, coord);
  try {
    const position = convertCoordToCellRef(coord);
    const returned = formulaParser.parse(formula, position);
    // console.log(
    //   "formula",
    //   formula,
    //   "parsedFormula",
    //   parsedFormula,
    //   "coord",
    //   coord,
    //   "returned",
    //   returned
    // );
    return returned instanceof FormulaError ? returned.toString() : returned;
  } catch (error) {
    console.log("err", error, formula, coord);
    if (error instanceof FormulaError) {
      return error.toString();
    }
    if (error instanceof Error) {
      return error.toString();
    }
    throw error;
  }
}

function convertCoordToCellRef(coord: Coord): CellRef {
  const point = {
    row: coord.row + 1,
    col: columns.indexOf(coord.col),
    sheet: coord.tableId,
    address: `${coord.col}${coord.row + 1}`,
  };
  return point;
}

export function evaluate(
  formula: string,
  point: Point,
  formulaParser: FormulaParser
): Value {
  try {
    const position = convertPointToCellRef(point);
    const returned = formulaParser.parse(formula, position);
    return returned instanceof FormulaError ? returned.toString() : returned;
  } catch (error) {
    if (error instanceof FormulaError) {
      return error.toString();
    }
    throw error;
  }
}

function convertPointToCellRef(point: Point): CellRef {
  return {
    row: point.row + 1,
    col: point.column + 1,
    // TODO: fill once we support multiple sheets
    sheet: "Sheet1",
    address: `${columns[point.column]}${point.row + 1}`,
  };
}

function isNumeric(value: string): boolean {
  // console.log("isNumeric", value, /^-?\d+(\.\d+)?$/.test(value));
  return /^-?\d+(\.\d+)?$/.test(value);
}
