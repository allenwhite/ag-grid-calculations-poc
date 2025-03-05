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

import mathJson from "../backendData/math.json";
import { evaluateExpression, ExpressionNode } from "../model/calculations";

const SimpleTable: React.FC = () => {
  // Example usage:
  const equation: ExpressionNode = {
    operation: "multiply",
    operand1: {
      operation: "add",
      operand1: { variable: "A" },
      operand2: { variable: "B" },
    },
    operand2: { variable: "C" },
  };

  const variables = {
    A: 1,
    B: 2,
    C: 3,
  };

  const result = evaluateExpression(equation, variables);
  console.log(2222, result); // Output: 9, since (1 + 2) * 3 = 9

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
  const [rowData, setRowData] = useState<any[]>([
    { a: "", b: "", c: 22, d: 44 },
    { a: "", b: "", c: 33, d: 44 },
    { a: "", b: "", c: 11, d: 44 },
  ]);
  // i think we could autogenerate this to be the correct size
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
