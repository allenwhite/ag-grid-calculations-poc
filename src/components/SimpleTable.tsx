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

import tableConfig from "../backendData/tableConfig.json";
import { CalculationTable, getColDefs } from "../model/tableDefinition";

const SimpleTable: React.FC = () => {
  const tableData: CalculationTable = tableConfig;

  const gridRef = useRef<AgGridReact>(null);

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    console.log("onCellValueChanged", event);
    // if (!event.column) return;
    // const field = event.column.getColId();
    // if (field === "weight" || field === "pricePerGram") {
    gridRef.current?.api.refreshCells({
      force: true,
      // columns: ["timePeriod"],
    });
    // }
  };

  const onCellClicked = (event: CellClickedEvent) => {
    if (!event.column) return;
    // setSelectedCell(`${event.column.getColId()}: ${event.value}`);
  };

  const defaultColDef = {
    cellStyle: (params: any) => {
      return params.colDef.editable
        ? { backgroundColor: "lightgreen" }
        : { backgroundColor: "lightgray" };
    },
  };

  const columnDefs = [
    { headerName: "Make", field: "make" },
    { headerName: "Model", field: "model" },
    { headerName: "Price", field: "price" },
  ];

  const rowData = [
    { make: "Toyota", model: "Celica", price: 35000 },
    { make: "Ford", model: "Mondeo", price: 32000 },
    { make: "Porsche", model: "Boxster", price: 72000 },
  ];

  return (
    <div className="ag-theme-alpine" style={{ height: 400, width: "100%" }}>
      <AgGridReact
        ref={gridRef}
        columnDefs={getColDefs(tableData.columnDefinitions)}
        rowData={rowData}
        gridOptions={{ headerHeight: 120 }}
        // columnDefs={getColDefs(table.columnDefinitions)}
        defaultColDef={defaultColDef}
        modules={[ClientSideRowModelModule]}
        onCellValueChanged={onCellValueChanged}
        onCellClicked={onCellClicked}
      />
    </div>
  );
};

export default SimpleTable;
