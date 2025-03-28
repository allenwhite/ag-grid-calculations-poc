# Formula Parser

## Summary

We borrowed the formula parser typescript interface from [react-spreadsheet](https://github.com/iddan/react-spreadsheet) and modified it to better work with `ag-grid`. Under the hood, `calc-enginesheet` uses [fast-formula-parser](https://github.com/iddan/fast-formula-parser) which is an implementation of the Excel formula parser. Currently, fast-formula-parser is 95% code covered, and covers 97.6% of all functions used in the 2024 workbook

## Implementation

Our tables have to be remotely defined, so the structures below are designed to be serializable and can be produced nearly automatically from our python scripts.
You can look at the JSON driving these tables in the [backendData folder](../backendData)

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
Most of the magic here happens in [formula.ts](./engine/formula.ts). Tests for this interface are currently in [formula.test.ts](./engine/formula.test.ts).

## Caveats

- Looks like fast-formula-parser doesn't handle range outputs. For example, we can use LEN(A1) but not LEN(A1:A10)...
- The excel workbook is not following what are considered best practices.

## Approach When A Function Doesnt Work Out of the Box

- Implement the missing functions (COUNTIFS, etc)
- Convert the excel formula to something that works (AI is actually really good at this)
- Define our own custom function (if the other two options are overly complex, or depend on range outputs that our parser doesnt support)

## Checklist

- [x] full page refs working
- [x] range support
- [x] tests
- [ ] Custom formulas
- [ ] Add result table
- [ ] Trim unused code
- [ ] make available as package for use elsewhere
