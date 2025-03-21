import "./App.css";
import CalculationTableView from "./components/CalculationTableView";
import table1Config from "./backendData/Method2-3Table1.json";
import table2Config from "./backendData/Method2-3Table2.json";
import { CalculationTable } from "./model/tableDefinition";
import { useState } from "react";

export type TableData = Record<string, any>[]; // { C: "11", D: "No" }
export type PageData = Record<string, TableData>;

function App() {
  const table1Data: CalculationTable = table1Config;
  const table2Data: CalculationTable = table2Config;

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
  newPageData[table1Data.tableId] = [getInitialEmptyData(table1Data)];
  newPageData[table2Data.tableId] = [getInitialEmptyData(table2Data)];

  const [pageData, setPageData] = useState<PageData>(newPageData);

  const addRow = () => {
    setPageData((prev) => {
      return {
        ...prev,
        [table1Data.tableId]: [
          ...prev[table1Data.tableId],
          getInitialEmptyData(table1Data),
        ],
      };
    });
  };

  return (
    <div className="App">
      <CalculationTableView
        tableDefinition={table1Data}
        pageData={pageData}
        addRow={addRow}
      />
      <div style={{ height: "80px" }}></div>
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
