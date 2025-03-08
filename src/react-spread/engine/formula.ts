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

export function convertStartDataToData(startData: any[]) {
  return startData.map((row) => Object.values(row));
}

export function createFormulaParser(
  data: any[],
  // data: Matrix.Matrix<CellBase>,
  config?: Omit<FormulaParserConfig, "onCell" | "onRange">
): FormulaParser {
  const formattedData = convertStartDataToData(data);
  return new FormulaParser({
    ...config,
    onCell: (ref) => {
      // const point: Point = {
      //   row: ref.row - 1,
      //   column: ref.col - 1,
      // };
      // const cell = Matrix.get(point, data);
      // console.log(
      //   "onCell",
      //   "ref",
      //   ref,
      //   "point",
      //   point,
      //   "data",
      //   data,
      //   "cell",
      //   cell
      // );
      // if (!isNaN(cell?.value as number)) return Number(cell?.value);
      // return cell?.value;
      return formattedData[ref.row - 1][ref.col - 1] as Value;
    },
    onRange: (ref) => {
      // const size = Matrix.getSize(data);
      // const start: Point = {
      //   row: ref.from.row - 1,
      //   column: ref.from.col - 1,
      // };
      // const end: Point = {
      //   row: Math.min(ref.to.row - 1, size.rows - 1),
      //   column: Math.min(ref.to.col - 1, size.columns - 1),
      // };
      // const dataSlice = Matrix.slice(start, end, data);
      // return Matrix.toArray(dataSlice, (cell) => {
      //   if (!isNaN(cell?.value as number)) return Number(cell?.value);
      //   return cell?.value;
      // });
      console.log("onRange", ref, formattedData);
      const arr = [];
      for (let row = ref.from.row; row <= ref.to.row; row++) {
        const innerArr = [];
        if (formattedData[row - 1]) {
          for (let col = ref.from.col; col <= ref.to.col; col++) {
            innerArr.push(formattedData[row - 1][col - 1]);
          }
        }
        arr.push(innerArr);
      }
      console.log("arr", arr);
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

const replaceRanges = (formula: string, currentPosition: Point) => {
  return formula.replace(/\$([A-Za-z]+)\$/g, (match, p1) => {
    return `$${p1}${currentPosition.row}`;
  });
};

export function evaluate(
  formula: string,
  point: Point,
  formulaParser: FormulaParser
): Value {
  const parsedFormula = replaceRanges(formula, point);
  console.log(parsedFormula);
  try {
    const position = convertPointToCellRef(point);
    const returned = formulaParser.parse(parsedFormula, position);
    console.log("returned", returned);
    return returned instanceof FormulaError ? returned.toString() : returned;
  } catch (error) {
    console.log("err", error);
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
  };
}
