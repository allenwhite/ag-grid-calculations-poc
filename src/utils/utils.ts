/**
 * Calculates the result of the Excel formula "=$C*$C/$D".
 *
 * This function takes three parameters representing the values of C and D.
 * It returns the result of multiplying C by itself and then dividing by D.
 *
 * @param c - The value of C.
 * @param d - The value of D.
 * @returns The result of the calculation (C * C / D).
 */
export function calculateExcelFormula(c: number, d: number): number {
  if (d === 0) {
    throw new Error("Division by zero is not allowed.");
  }
  return (c * c) / d;
}
