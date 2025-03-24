# Formula Parser

## Summary

We borrowed the formula parser typescript interface from [calc-enginesheet](https://github.com/iddan/calc-enginesheet) and modified it to better work with `ag-grid`. Under the hood, `calc-enginesheet` uses [fast-formula-parser](https://github.com/iddan/fast-formula-parser) which is an implementation of the Excel formula parser. Currently, fast-formula-parser is 95% code covered, and covers 97.6% of all functions used in the 2024 workbook

## TODO

- tests
- Cross table refs
- Lookup table refs
- range support
- Clean up current implementation
- Trim unused code
- make available as package for use elsewhere
