import React, { useState, useRef } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import {
  CellClickedEvent,
  CellValueChangedEvent,
} from "@ag-grid-community/core";

// Import ag-Grid styles
import "@ag-grid-community/styles/ag-grid.css";
import "@ag-grid-community/styles/ag-theme-alpine.css";

import tableConfig from "../backendData/betterTableConfig.json";
import { CalculationTable, getColDefs } from "../model/tableDefinition";
import { createFormulaParser, evaluate } from "../calc-engine/engine/formula";

const BetterTable: React.FC = () => {
  const tableData: CalculationTable = tableConfig;

  const gridRef = useRef<AgGridReact>(null);
  const defaultColDef = {
    cellStyle: (params: any) => {
      return params.colDef.editable
        ? { backgroundColor: "lightgreen" }
        : { backgroundColor: "lightgray" };
    },
    // autoHeight: true, // Enable auto height for headers
    wrapHeaderText: true, // Allow header text to wrap
    headerHeight: 200, // Set header height
  };
  // Extract fields from columnDefinitions to create initial rowData
  const initialRowData = tableConfig.columnDefinitions.reduce<
    Record<string, any>
  >((acc, colDef) => {
    acc[colDef.field] = "";
    return acc;
  }, {});

  const [rowData, setRowData] = useState<any[]>([initialRowData]);

  const fomulaParser = createFormulaParser(rowData);

  const addRow = () => {
    setRowData([...rowData, { ...initialRowData }]);
  };

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    // console.log("onCellValueChanged", event);
    gridRef.current?.api.refreshCells({
      force: true,
      // columns: ["timePeriod"],
    });
  };

  const onCellClicked = (event: CellClickedEvent) => {
    if (!event.column) return;
    // console.log(event);
    // setSelectedCell(`${event.column.getColId()}: ${event.value}`);
  };

  return (
    <div
      className="ag-theme-alpine"
      style={{ height: 400, width: "90%", marginLeft: "5%" }}
    >
      <AgGridReact
        ref={gridRef}
        headerHeight={200}
        columnDefs={getColDefs(
          tableData.columnDefinitions,
          rowData,
          setRowData,
          fomulaParser
        )}
        rowData={rowData}
        defaultColDef={defaultColDef}
        modules={[ClientSideRowModelModule]}
        onCellValueChanged={onCellValueChanged}
        onCellClicked={onCellClicked}
      />
      <button onClick={addRow}>Add Row</button>
    </div>
  );
};

export default BetterTable;
