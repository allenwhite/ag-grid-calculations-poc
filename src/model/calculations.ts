interface Condition {
  field: string;
  equals?: string;
  lessThan?: number;
}

interface IfCondition {
  check: string;
  conditions: Condition[];
  then: any;
  else: any;
}

export function instanceOfIfCondition(object: any): object is IfCondition {
  return (
    typeof object === "object" &&
    object !== null &&
    "check" in object &&
    "conditions" in object &&
    "then" in object &&
    "else" in object
  );
}

interface AverageIf {
  range: string;
  criteria: string;
  averageRange: string;
}

export function instanceOfAverageIfCondition(object: any): object is AverageIf {
  return (
    typeof object === "object" &&
    object !== null &&
    "range" in object &&
    "criteria" in object &&
    "averageRange" in object
  );
}

interface Calculations {
  excel: string;
  if: IfCondition;
  averageIf?: AverageIf;
}

export type { Calculations, Condition, IfCondition, AverageIf };

/**
 * we would have to define a JSON structure that models an equation...
 */
