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
    SUMIFS: (sumRange: CustomFunctionArg, ...criteria: CustomFunctionArg[]) => {
      console.log("SUMIFS sumRange", sumRange, criteria);
      // Convert the sum range to an array of numbers
      const sumArray = sumRange.value as number[];
      if (!Array.isArray(sumArray)) {
        throw new FormulaError("Invalid sum range");
      }

      if (criteria.length % 2 !== 0) {
        throw new FormulaError("Criteria should be in pairs");
      }

      // Initialize an array to keep track of which items match all criteria
      const matchArray = Array(sumArray.length).fill(true);

      // Process each pair of criteria
      for (let i = 0; i < criteria.length; i += 2) {
        const criteriaRange = criteria[i].value as any[];
        const criteriaValue = criteria[i + 1].value;

        if (
          !Array.isArray(criteriaRange) ||
          criteriaRange.length !== sumArray.length
        ) {
          throw new FormulaError(
            "Criteria range must be an array of the same length as the sum range"
          );
        }

        // Update matchArray based on the current criteria
        for (let j = 0; j < criteriaRange.length; j++) {
          if (typeof criteriaValue === "string") {
            if (
              criteriaValue.startsWith("<") ||
              criteriaValue.startsWith(">")
            ) {
              const operator = criteriaValue[0];
              const value = parseFloat(criteriaValue.slice(1));
              if (
                (operator === "<" && criteriaRange[j] >= value) ||
                (operator === ">" && criteriaRange[j] <= value)
              ) {
                matchArray[j] = false;
              }
            } else if (criteriaValue.startsWith("=")) {
              const value = criteriaValue.slice(1);
              if (criteriaRange[j] !== value) {
                matchArray[j] = false;
              }
            } else {
              if (criteriaRange[j] !== criteriaValue) {
                matchArray[j] = false;
              }
            }
          } else {
            if (criteriaRange[j] !== criteriaValue) {
              matchArray[j] = false;
            }
          }
        }
      }

      // Sum the values in sumArray where matchArray is true
      return sumArray.reduce(
        (acc, val, idx) => (matchArray[idx] ? acc + val : acc),
        0
      );
    },
    COUNTIFS: (...criteria: CustomFunctionArg[]) => {
      if (criteria.length % 2 !== 0) {
        throw new FormulaError("Criteria should be in pairs");
      }
      if (!Array.isArray(criteria[0].value)) {
        throw new FormulaError("Criteria range must be an array");
      }

      const matchArray = Array(criteria[0].value.length).fill(true);

      for (let i = 0; i < criteria.length; i += 2) {
        const criteriaRange = criteria[i].value as any[];
        const criteriaValue = criteria[i + 1].value;
        console.log("criteriaRange", criteriaRange);
        console.log("criteriaValue", criteriaValue);
        if (!Array.isArray(criteriaRange)) {
          throw new FormulaError("Criteria range must be an array");
        }

        for (let j = 0; j < criteriaRange.length; j++) {
          if (typeof criteriaValue === "string") {
            if (
              criteriaValue.startsWith("<") ||
              criteriaValue.startsWith(">")
            ) {
              const operator = criteriaValue[0];
              const value = parseFloat(criteriaValue.slice(1));
              if (
                (operator === "<" && criteriaRange[j] >= value) ||
                (operator === ">" && criteriaRange[j] <= value)
              ) {
                matchArray[j] = false;
              }
            } else if (criteriaValue.startsWith("=")) {
              const value = criteriaValue.slice(1);
              if (criteriaRange[j] !== value) {
                matchArray[j] = false;
              }
            } else {
              if (criteriaRange[j][0] !== criteriaValue) {
                matchArray[j] = false;
              }
            }
          } else {
            if (criteriaRange[j] !== criteriaValue) {
              matchArray[j] = false;
            }
          }
        }
      }

      return matchArray.reduce((acc, match) => (match ? acc + 1 : acc), 0);
    },
  };
};

export default customFunctions;
