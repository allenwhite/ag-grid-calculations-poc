import { CellStyle, ColDef, ValueGetterFunc } from "@ag-grid-community/core";

interface TableModel<T> {
  columns: ColDef<T>[];
  data: T[];
}

export default TableModel;

interface TableDefinition {
  description: string;
  columnDefinitions: ColumnDefinitions[];
}

interface ComparativeDef {
  field: string;
}

class StyleRule {
  conditions: ComparativeDef[];
  style: CellStyle;

  constructor(conditions: ComparativeDef[], style: CellStyle) {
    this.conditions = conditions;
    this.style = style;
  }
}

interface ColumnDefinitions {
  headerName: string;
  field: string;
  editable: boolean;
  options?: string[] | null;
  cellStyleRules?: StyleRule[] | null;
  calculations?: string | null;
}

class ColumnDefinitions {
  headerName: string;
  field: string;
  editable: boolean;
  options?: string[] | null;
  cellStyleRules?: StyleRule[] | null;
  calculations?: string | null;

  constructor(
    headerName: string,
    field: string,
    editable: boolean,
    options?: string[] | null,
    cellStyleRules?: StyleRule[] | null,
    calculations?: string | null
  ) {
    this.headerName = headerName;
    this.field = field;
    this.editable = editable;
    this.options = options;
    this.cellStyleRules = cellStyleRules;
    this.calculations = calculations;
  }
}

class CalculationTable implements TableDefinition {
  description: string;
  columnDefinitions: ColumnDefinitions[];

  constructor(description: string, columnDefinitions: ColumnDefinitions[]) {
    this.description = description;
    this.columnDefinitions = columnDefinitions;
  }
}

const getColDefs = (columnDefinitions: ColumnDefinitions[]): ColDef[] => {
  return columnDefinitions.map((cd) => ({
    headerName: cd.headerName,
    field: cd.field,
    editable: cd.editable,
    sortable: false,
    ...(cd.cellStyleRules
      ? {
          cellStyle: (params: any): CellStyle => {
            if (!cd.cellStyleRules) return {};
            return applyStyleRules(params, cd.cellStyleRules);
          },
        }
      : {}),
    ...(cd.options
      ? {
          cellEditor: "agSelectCellEditor",
          cellEditorParams: { values: cd.options },
        }
      : {}),
    ...(cd.calculations
      ? {
          valueGetter: (params: any) => {
            if (!cd.calculations) return {};
            doCalculation(params, cd.calculations);
          },
        }
      : {}),
  }));
};

function applyStyleRules(params: any, rules: StyleRule[]): CellStyle {
  console.log(params, rules);
  for (const rule of rules) {
    const { conditions, style } = rule;

    const allConditionsMet = conditions.every((condition: any) => {
      const fieldValue = params.data[condition.field];

      if (condition.value !== undefined && fieldValue !== condition.value) {
        return false;
      }

      if (
        condition.greaterThan !== undefined &&
        fieldValue <= condition.greaterThan
      ) {
        return false;
      }

      return true;
    });

    if (allConditionsMet) {
      return style;
    }
  }
  return params.colDef.editable
    ? { backgroundColor: "lightgreen" }
    : { backgroundColor: "lightgray" };
}

function doCalculation(params: any, calcs: string): string {
  console.log(calcs, params);
  // a*c
  // a: c:
  return "?";
}

/**
 * aggregation
 * referencing another table
 */

export { CalculationTable, getColDefs };
