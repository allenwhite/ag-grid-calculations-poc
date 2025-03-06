import { test, expect } from "@jest/globals";
import { calculateExcelFormula } from "./utils";

describe("calculateExcelFormula", () => {
  test("should calculate correctly with valid inputs", () => {
    expect(calculateExcelFormula(4, 2)).toBe(8);
    expect(calculateExcelFormula(9, 3)).toBe(27);
  });

  test("should throw an error for division by zero", () => {
    expect(() => calculateExcelFormula(4, 0)).toThrow(
      "Division by zero is not allowed."
    );
  });
});
