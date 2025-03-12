import "./App.css";
import CalculationTableView from "./components/CalculationTableView";
import table1Config from "./backendData/Method2-3Table1.json";
import table2Config from "./backendData/Method2-3Table2.json";
import { CalculationTable } from "./model/tableDefinition";

export type TableData = Record<string, any>;
export type PageData = Record<string, TableData>;

function App() {
  const table1Data: CalculationTable = table1Config;
  const table2Data: CalculationTable = table2Config;

  /**
   * Full page data to enable cross table references
   * {
   *  tableId1: { table data },
   *  tableId2: { table data },
   * }
   */
  const pageData: PageData = {};
  pageData[table1Data.tableId] = getInitialEmptyData(table1Data);
  pageData[table2Data.tableId] = getInitialEmptyData(table2Data);

  return (
    <div className="App">
      <CalculationTableView tableData={table1Data} pageData={pageData} />
      <div style={{ height: "80px" }}></div>
      <CalculationTableView tableData={table2Data} pageData={pageData} />
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
