import "./App.css";
import CalculationTableView from "./components/CalculationTableView";
import table1ConfigJSON from "./backendData/Method2-3Table1.json";
import table2ConfigJSON from "./backendData/Method2-3Table2.json";
import refTableConfigJSON from "./backendData/Method2-3RefTable.json";
import { CalculationTable } from "./model/tableDefinition";
import { useState } from "react";

export type TableData = Record<string, any>[];
export type PageData = Record<string, TableData>;

function App() {
  const table1Config: CalculationTable = table1ConfigJSON;
  const table2Config: CalculationTable = table2ConfigJSON;
  const refTableConfig: CalculationTable = refTableConfigJSON;

  /**
   * Full page data to enable cross table references
   * {
   *  tableId1: [
   *    { table data }
   *    { table data }
   * ],
   *  tableId2: [
   *    { table data }
   *    { table data }
   *  ],
   * }
   */
  const newPageData: PageData = {};
  newPageData[table1Config.tableId] = [getInitialEmptyData(table1Config)];
  newPageData[table2Config.tableId] = [getInitialEmptyData(table2Config)];
  newPageData[refTableConfig.tableId] = [getInitialEmptyData(refTableConfig)];

  const [pageData, setPageData] = useState<PageData>(newPageData);

  /**
   * Expand to work with multiple tables
   */
  const addRow = () => {
    setPageData((prev) => {
      return {
        ...prev,
        [table1Config.tableId]: [
          ...prev[table1Config.tableId],
          getInitialEmptyData(table1Config),
        ],
      };
    });
  };

  return (
    <div className="App">
      <CalculationTableView
        tableDefinition={table1Config}
        pageData={pageData}
        addRow={addRow}
      />
      <div style={{ height: "80px" }}></div>
      <CalculationTableView
        tableDefinition={refTableConfig}
        pageData={pageData}
        addRow={addRow}
      />
      {/* <CalculationTableView tableData={table2Data} pageData={pageData} /> */}
    </div>
  );
}

const getInitialEmptyData = (
  tableData: CalculationTable
): Record<string, any> => {
  return tableData.columnDefinitions.reduce<Record<string, any>>(
    (acc, colDef) => {
      acc[colDef.field] = "";
      return acc;
    },
    {}
  );
};

export default App;
