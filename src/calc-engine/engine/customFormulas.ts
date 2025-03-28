import FormulaParser, { FormulaError, Value } from "fast-formula-parser";
import { PageData } from "../../model/tableDefinition";

class CustomFunctionArg {
  /**
      {value: 222, isArray: false, isRangeRef: false, isCellRef: false}
      {value: Array(2), isArray: false, isRangeRef: true, isCellRef: false}
        this seems to come back as [[3], [6]] so enjoy that idk
      {value: '4', isArray: false, isRangeRef: false, isCellRef: true} 
    */
  constructor(
    public value: Value,
    public isArray: boolean,
    public isRangeRef: boolean,
    public isCellRef: boolean
  ) {}
}

/**
 * Returns custom functions for use in formula parsing
 *
 * All these functions have access to the given pageData.
 *
 * Functions take in customFunctionArgs. We could simplify this interface if we wanted,
 * since getting array values out of this object is a little gross.
 *
 * Some functions seem to take in the formula parser implicitly as the first argument, not sure why.
 *
 * @param pageData Page data to be used in custom functions
 * @returns Custom functions
 */
const customFunctions = (pageData: PageData) => {
  return {
    NOBLANKS: (range: CustomFunctionArg, row: CustomFunctionArg) => {
      const currentRow = row.value as number;
      //   console.log("NOBLANKS", pageData);
      const noBlanksColumnValues = (range.value as Value[])
        .map((v) => v.toString())
        .filter((v) => v.length > 0);
      return noBlanksColumnValues[currentRow - 1] ?? "";
    },
    INDIRECT: (
      _: FormulaParser,
      ref_text: CustomFunctionArg = {
        value: "",
        isArray: false,
        isRangeRef: false,
        isCellRef: false,
      },
      a1: CustomFunctionArg = {
        value: true,
        isArray: false,
        isRangeRef: false,
        isCellRef: false,
      }
    ) => {
      console.log("INDIRECT ref_text", ref_text, a1);
      if (typeof ref_text.value !== "string") {
        throw new FormulaError("#REF!");
      }

      let reference = ref_text.value;

      // Check if reference is a row range
      const rangeMatch = reference.match(/^(\d+):(\d+)$/);
      if (rangeMatch) {
        const startRow = parseInt(rangeMatch[1], 10);
        const endRow = 2; //parseInt(rangeMatch[2], 10); COME BACK TO THIS
        if (startRow > endRow) {
          throw new FormulaError("#REF!");
        }
        // Generate an array of row numbers
        const rangeResult = Array.from(
          { length: endRow - startRow + 1 },
          (_, i) => startRow + i
        );
        console.log("INDIRECT rangeResult", rangeResult);
        return rangeResult;
      }

      // Check for A1-style references
      const match = reference.match(/([A-Z]+)([0-9]+)/);
      console.log("INDIRECT match", match);
      if (!match) {
        throw new FormulaError("#REF! INDIRECT match");
      }

      const column = match[1];
      const row = parseInt(match[2], 10);

      // Access the value from pageData using the reference
      const tableId = ref_text.value;
      const cellValue = pageData[tableId]?.data[row - 1]?.[column];
      console.log("INDIRECT cellValue", cellValue);
      if (cellValue === undefined) {
        throw new FormulaError("#REF! INDIRECT cellValue");
      }

      return cellValue;
    },
    SMALL: (array: CustomFunctionArg, k: CustomFunctionArg) => {
      console.log("SMALL array", array, k);
      if (!Array.isArray(array.value) || array.value.length === 0) {
        console.log("SMALL array not valid");
        throw new FormulaError("#NUM!");
      }

      const sortedArray = array.value
        .flat()
        .sort((a, b) => Number(a) - Number(b));

      if (
        !(typeof k.value === "number") ||
        k.value <= 0 ||
        k.value > sortedArray.length
      ) {
        throw new FormulaError("#NUM!");
      }

      return sortedArray[k.value - 1];
    },
  };
};

export default customFunctions;
