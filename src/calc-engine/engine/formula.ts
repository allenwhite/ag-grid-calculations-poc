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

// test this, its not working perfectly
export function convertStartDataToData(startData: any[]) {
  const result = startData.map((row) => {
    return Object.keys(row).map((key) => row[key]);
  });
  console.log(
    "convertStartDataToData(startData:)",
    startData,
    result,
    Object.values(startData[0])
  );
  return result;
} //  i think this can just be values...

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
  data: any[],
  config?: Omit<FormulaParserConfig, "onCell" | "onRange">
): FormulaParser {
  console.log("data", data);
  return new FormulaParser({
    ...config,
    onCell: (ref) => {
      const formattedData = convertStartDataToData(data);
      console.log("onCell", ref, formattedData);
      const val = ref.address
        ? data[ref.row - 1][ref.address.replace("$", "").replace(/[0-9]/g, "")]
        : formattedData[ref.row - 1][ref.col - 1];
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
    const dependencies = depParser.parse(formula, convertCoordToCellRef(point));

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
  constructor(public row: number, public col: string) {}
}

export function evaluate(
  formula: string,
  coord: Coord | Point,
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

// I should add in the old ones and make a separate one for Coord

function convertCoordToCellRef(coord: Coord | Point): CellRef {
  console.log("coord", coord, "col in coord", "col" in coord);
  const point2 = {
    row: coord.row + 1,
    col: "col" in coord ? columns.indexOf(coord.col) : coord.column + 1,
    // TODO: fill once we support multiple sheets
    sheet: "Sheet1",
    address:
      "col" in coord
        ? `${coord.col}${coord.row + 1}`
        : columns[coord.column + 1],
  };
  console.log("convertPointToCellRef", point2);
  return point2;
}

function isNumeric(value: string): boolean {
  console.log("isNumeric", value, /^-?\d+(\.\d+)?$/.test(value));
  return /^-?\d+(\.\d+)?$/.test(value);
}
