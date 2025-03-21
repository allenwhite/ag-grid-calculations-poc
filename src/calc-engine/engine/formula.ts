import FormulaParser, {
  CellRef,
  DepParser,
  FormulaError,
  FormulaParserConfig,
  Value,
} from "fast-formula-parser";
import { PointRange } from "../point-range";
import { Point } from "../point";
import * as Matrix from "../matrix";
import { CellBase } from "../types";
import { PointSet } from "./point-set";
import { PageData } from "../../App";
import { CalculationTable } from "../../model/tableDefinition";

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
  tableDefinition: CalculationTable,
  data: PageData,
  config?: Omit<FormulaParserConfig, "onCell" | "onRange">
): FormulaParser {
  const tableId = tableDefinition.tableId;
  return new FormulaParser({
    ...config,
    onCell: (ref: CellRef) => {
      const formattedData = convertStartDataToData(data);
      console.log("onCell", ref, "data", data);
      const val = ref.address
        ? data[tableId][ref.row - 1][
            ref.address.replace("$", "").replace(/[0-9]/g, "")
          ]
        : formattedData[tableId][ref.row - 1][ref.col - 1];
      if (isNumeric(val)) return Number(val);
      if (val?.toString()?.length === 0) return 0;
      return val;
    },
    onRange: (ref) => {
      const formattedData = convertStartDataToData(data);

      const colOffset = columns.indexOf(Object.keys(data[0])[0]);
      console.log("onRange", ref, formattedData, data, colOffset);
      const arr = [];
      for (let row = ref.from.row; row <= ref.to.row; row++) {
        const innerArr = [];
        if (formattedData[row - 1]) {
          for (let col = ref.from.col; col <= ref.to.col; col++) {
            console.log("pushing", row - 1, col - 1 - colOffset, formattedData);
            innerArr.push(formattedData[row - 1][col - 1 - colOffset]);
          }
        }
        arr.push(innerArr);
      }
      return arr as Value[];
    },
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
const replaceRanges = (formula: string, currentPosition: Coord | Point) => {
  return formula
    .replace(FORMULA_VALUE_PREFIX, "")
    .replace(/\$([A-Za-z]+)\$/g, (match, p1) => {
      return `$${p1}${currentPosition.row}`;
    });
};

export class Coord {
  constructor(public row: number, public col: string, public tableId: string) {}
}

export function evaluateCC(
  formula: string,
  coord: Coord,
  formulaParser: FormulaParser
): Value {
  console.log("formula", formula, "coord", coord);
  const parsedFormula = replaceRanges(formula, coord);
  console.log("parsedFormula", parsedFormula);
  try {
    const position = convertCoordToCellRef(coord);
    const returned = formulaParser.parse(parsedFormula, position);
    console.log("returned", returned);
    return returned instanceof FormulaError ? returned.toString() : returned;
  } catch (error) {
    console.log("err", error);
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
  const point2 = {
    row: 0,
    col: 3,
    sheet: coord.tableId,
    address: "F1", //`${coord.col}${coord.row}`,
  };
  console.log("convertCoordToCellRef(coord: ", coord, "): ", point2);
  return point2;
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
    address: `${columns.indexOf(`${point.column}`)}${point.row + 1}`,
  };
}

function isNumeric(value: string): boolean {
  // console.log("isNumeric", value, /^-?\d+(\.\d+)?$/.test(value));
  return /^-?\d+(\.\d+)?$/.test(value);
}
