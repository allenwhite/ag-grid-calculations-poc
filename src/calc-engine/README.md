# Formula Parser

## Summary

We borrowed the formula parser typescript interface from [react-spreadsheet](https://github.com/iddan/react-spreadsheet) and modified it to better work with `ag-grid`. Under the hood, `calc-enginesheet` uses [fast-formula-parser](https://github.com/iddan/fast-formula-parser) which is an implementation of the Excel formula parser. Currently, fast-formula-parser is 95% code covered, and covers 97.6% of all functions used in the 2024 workbook

## Implementation

#### CalcTableDefinition

We construct this json-ifyable structure from our python excel book scraper

```typescript
export type ColumnDefinitions = {
  headerName: string;
  field: string;
  editable: boolean;
  options?: string[] | null;
  cellStyle?: StyleExpression | null;
  excelFormula?: string | null;
  funcCall?: FuncCall | null;
};

export type CalcTableDefinition = {
  tableId: string;
  description: string;
  type: string; // "entry" | "reference" | "result"
  columnDefinitions: ColumnDefinitions[];
  dependentTables?: string[];
  externalRefs?: { [key: string]: string } | null;
};
```

#### PageData

Full page data to enable cross table references

```typescript
   {
    tableId1: {
      ref: AgGridReact,
      tableDefinition: CalcTableDefinition,
      data: [
        { row data }
        { row data }
      ]
    },
    tableId2: {
      ref: AgGridReact,
      tableDefinition: CalcTableDefinition,
      data: [
        { row data }
      ]
    }
  }
```

#### FormulaParser

Our formula parser takes in the full PageData and is configured to return the correct data when requested. It is designed to handle the difficulty of cross table references, range references, and custom functions behind the scenes.

## Checklist

- [x] full page refs working
- [x] range support
- [x] tests
- [ ] Custom formulas
- [ ] Add result table
- [ ] Trim unused code
- [ ] make available as package for use elsewhere
