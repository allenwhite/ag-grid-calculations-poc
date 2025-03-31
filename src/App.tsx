import "./App.css";
import CalculationTableView from "./components/CalculationTableView";
import table1ConfigJSON from "./backendData/Method2-3Table1.json";
import table2ConfigJSON from "./backendData/Method2-3Table2.json";
import refTableConfigJSON from "./backendData/Method2-3RefTable.json";
import lookupsConfigJSON from "./calc-engine/staticData/Subpart-W-Calculation-Tool-for-RY24_Lookups.json";
import {
  addRowFor,
  CalcTableDefinition,
  PageData,
} from "./model/tableDefinition";
import { useRef, useState } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import { createCCFormulaParser } from "./calc-engine/engine/formula";

function App() {
  const table1Config = CalcTableDefinition.fromJson(table1ConfigJSON);
  const table2Config = CalcTableDefinition.fromJson(table2ConfigJSON);
  const refTableConfig = CalcTableDefinition.fromJson(refTableConfigJSON);

  const lookupsConfig = CalcTableDefinition.fromLookupJSON(lookupsConfigJSON);

  /**
   * Full page data to enable cross table references
   * {
   *  tableId1: {
   *    ref: AgGridReact,
   *    tableDefinition: CalcTableDefinition,
   *    data: [
   *      { row data }
   *      { row data }
   *    ]
   *  },
   *  tableId2: {
   *    ref: AgGridReact,
   *    tableDefinition: CalcTableDefinition,
   *    data: [
   *      { row data }
   *    ]
   *  }
   * }
   */
  const newPageData: PageData = {};
  const gridRef1 = useRef<AgGridReact>(null);
  const gridRef2 = useRef<AgGridReact>(null);
  const gridRef3 = useRef<AgGridReact>(null);

  newPageData[table1Config.tableId] = {
    ref: gridRef1,
    tableDefinition: table1Config,
    data: [table1Config.emptyRowData],
  };
  newPageData[table2Config.tableId] = {
    ref: gridRef2,
    tableDefinition: table2Config,
    data: [table2Config.emptyRowData],
  };
  newPageData[refTableConfig.tableId] = {
    ref: gridRef3,
    tableDefinition: refTableConfig,
    data: [refTableConfig.emptyRowData],
  };
  newPageData[lookupsConfig.tableId] = {
    ref: null,
    tableDefinition: lookupsConfig,
    data: lookupsConfigJSON.lookups,
  };

  const [pageData, setPageData] = useState<PageData>(newPageData);

  // single formula parser to handle all the data on the page
  const fomulaParser = createCCFormulaParser(pageData);

  /**
   * Adds a row of empty data to the specified tables in the current page data
   */
  const addRow = (tableIds: string[]) => {
    setPageData((prev) => {
      return addRowFor(prev, tableIds);
    });
  };

  return (
    <div className="App">
      <CalculationTableView
        tableDefinition={table1Config}
        pageData={pageData}
        setPageData={setPageData}
        fomulaParser={fomulaParser}
        addRow={addRow}
      />
      <div style={{ height: "80px" }}></div>
      <CalculationTableView
        tableDefinition={refTableConfig}
        pageData={pageData}
        setPageData={setPageData}
        fomulaParser={fomulaParser}
        addRow={addRow}
      />
      <div style={{ height: "80px" }}></div>
      <CalculationTableView
        tableDefinition={table2Config}
        pageData={pageData}
        setPageData={setPageData}
        fomulaParser={fomulaParser}
        addRow={addRow}
      />
    </div>
  );
}

export default App;
