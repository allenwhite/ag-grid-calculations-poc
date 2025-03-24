# Calculations POC

This project serves as a proof of concept for an Excel-like calculations engine. It is written in react, and uses tables from ag-grid to display data, and a retofited version of the [react-spreadsheet](https://github.com/iddan/react-spreadsheet) type-compatible interface written overtop of [fast-formula-parser](https://github.com/iddan/fast-formula-parser).

Run the project with

```bash
npm start
```

Run the tests for our engine with

```bash
npm test formula.test.ts
```

Print out all calculated data as test to the console with cases by setting `PRINT_TESTS_TO_CONSOLE` to `true` in the `tableDefinition.ts` file.

You can see detailed notes around the calculations solution [here](./src/calc-engine/README.md).
