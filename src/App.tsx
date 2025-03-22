import "./App.css";
import CalculationTableView from "./components/CalculationTableView";
import table1ConfigJSON from "./backendData/Method2-3Table1.json";
import table2ConfigJSON from "./backendData/Method2-3Table2.json";
import refTableConfigJSON from "./backendData/Method2-3RefTable.json";
import { CalculationTable } from "./model/tableDefinition";
import { useRef, useState } from "react";
import { AgGridReact } from "@ag-grid-community/react";

export type TableData = {
  ref: React.RefObject<AgGridReact<any> | null>;
  data: Record<string, any>[];
};
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
  const gridRef1 = useRef<AgGridReact>(null);
  const gridRef2 = useRef<AgGridReact>(null);
  const gridRef3 = useRef<AgGridReact>(null);

  newPageData[table1Config.tableId] = {
    ref: gridRef1,
    data: [getInitialEmptyData(table1Config)],
  };
  newPageData[table2Config.tableId] = {
    ref: gridRef2,
    data: [getInitialEmptyData(table2Config)],
  };
  newPageData[refTableConfig.tableId] = {
    ref: gridRef3,
    data: [getInitialEmptyData(refTableConfig)],
  };

  const [pageData, setPageData] = useState<PageData>(newPageData);

  /**
   * Expand to work with multiple tables
   */
  const addRow = () => {
    // setPageData((prev) => {
    //   return {
    //     ...prev,
    //     [table1Config.tableId]: [
    //       ...prev[table1Config.tableId],
    //       getInitialEmptyData(table1Config),
    //     ],
    //   };
    // });
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
