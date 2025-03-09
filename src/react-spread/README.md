# Formula Parser

## Summary

We borrowed the formula parser typescript interface from [react-spreadsheet](https://github.com/iddan/react-spreadsheet) and modified it to better work with `ag-grid`. Under the hood, `react-spreadsheet` uses [fast-formula-parser](https://github.com/iddan/fast-formula-parser) which is an implementation of the Excel formula parser. Currently, fast-formula-parser is 95% code covered, and covers 97.6% of all functions used in the 2024 workbook

## TODO

- Clean up current implementation
- Trim unused code
