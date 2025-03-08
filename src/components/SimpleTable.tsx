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
import { createFormulaParser, evaluate } from "../react-spread/engine/formula";
import { Point } from "../react-spread/point";

const SimpleTable: React.FC = () => {
  const tableData: CalculationTable = tableConfig;

  const gridRef = useRef<AgGridReact>(null);
  const defaultColDef = {
    cellStyle: (params: any) => {
      return params.colDef.editable
        ? { backgroundColor: "lightgreen" }
        : { backgroundColor: "lightgray" };
    },
  };
  const [rowData, setRowData] = useState<any[]>([
    { a: "", b: "", c: 22, d: 44 },
    { a: "", b: "", c: 33, d: 77 },
    { a: "", b: "", c: 11, d: 44 },
  ]);
  // i think we could autogenerate this to be the correct size

  const fomulaParser = createFormulaParser(rowData);

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
    console.log(event);
    const result = evaluate(
      "$C$+$D$",
      { column: 1, row: (event.rowIndex ?? 0) + 1 },
      fomulaParser
    );
    console.log(result);
    // setSelectedCell(`${event.column.getColId()}: ${event.value}`);
  };

  return (
    <div className="ag-theme-alpine" style={{ height: 400, width: "100%" }}>
      <AgGridReact
        ref={gridRef}
        columnDefs={getColDefs(tableData.columnDefinitions, rowData)}
        rowData={rowData}
        defaultColDef={defaultColDef}
        modules={[ClientSideRowModelModule]}
        onCellValueChanged={onCellValueChanged}
        onCellClicked={onCellClicked}
      />
    </div>
  );
};

export default SimpleTable;
