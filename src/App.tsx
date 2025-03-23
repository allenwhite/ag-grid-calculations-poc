import "./App.css";
import CalculationTableView from "./components/CalculationTableView";
import table1ConfigJSON from "./backendData/Method2-3Table1.json";
import table2ConfigJSON from "./backendData/Method2-3Table2.json";
import refTableConfigJSON from "./backendData/Method2-3RefTable.json";
import { CalcTableDefinition } from "./model/tableDefinition";
import { useRef, useState } from "react";
import { AgGridReact } from "@ag-grid-community/react";

export type TableData = {
  ref: React.RefObject<AgGridReact<any> | null>;
  tableDefinition: CalcTableDefinition;
  data: Record<string, any>[];
};
export type PageData = Record<string, TableData>;

function App() {
  const table1Config = CalcTableDefinition.fromJson(table1ConfigJSON);
  const table2Config = CalcTableDefinition.fromJson(table2ConfigJSON);
  const refTableConfig = CalcTableDefinition.fromJson(refTableConfigJSON);

  /**
   * TODO: redo this
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

  const [pageData, setPageData] = useState<PageData>(newPageData);

  /**
   * Expand to work with multiple tables
   */
  const addRow = (tableId: string) => {
    setPageData((prev) => {
      return {
        ...prev,
        [tableId]: {
          ...prev[tableId],
          data: [
            ...prev[tableId].data,
            prev[tableId].tableDefinition.emptyRowData,
          ],
        },
      };
    });
  };

  return (
    <div className="App">
      <CalculationTableView
        tableDefinition={table1Config}
        pageData={pageData}
        addRow={() => addRow(table1Config.tableId)}
      />
      <div style={{ height: "80px" }}></div>
      <CalculationTableView
        tableDefinition={refTableConfig}
        pageData={pageData}
        addRow={() => addRow(refTableConfig.tableId)}
      />
      {/* <CalculationTableView tableData={table2Data} pageData={pageData} /> */}
    </div>
  );
}

export default App;
