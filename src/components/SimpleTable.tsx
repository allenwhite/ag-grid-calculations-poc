import React, { useState, useRef, useEffect, useMemo } from "react";
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
import table2Config from "../backendData/table2Config.json";
import { CalculationTable, getColDefs, ColumnDefinition } from "../model/tableDefinition";
import { registerTable } from "../model/tableRegistry";

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

  // Cast the imported JSON configs to CalculationTable
  const tableData = useMemo(() => new CalculationTable(
    tableConfig.description,
    tableConfig.columnDefinitions as ColumnDefinition[],
    tableConfig.id
  ), []);
  
  const table2Data = useMemo(() => new CalculationTable(
    table2Config.description,
    table2Config.columnDefinitions as ColumnDefinition[],
    table2Config.id
  ), []);

  const gridRef1 = useRef<AgGridReact>(null);
  const gridRef2 = useRef<AgGridReact>(null);

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    console.log("onCellValueChanged", event);

    // Determine which table was changed
    const isTable1 = event.api === gridRef1.current?.api;
    
    // Update the registry with the new data
    if (isTable1) {
      const updatedData = [...rowData1];
      if (event.node.rowIndex !== null && event.node.rowIndex !== undefined) {
        updatedData[event.node.rowIndex] = { 
          ...updatedData[event.node.rowIndex], 
          [event.colDef.field || '']: event.newValue 
        };
      }
      setRowData1(updatedData);
      registerTable(tableData, updatedData);
      
      gridRef1.current?.api.refreshCells({
        force: true,
      });
    } else {
      const updatedData = [...rowData2];
      if (event.node.rowIndex !== null && event.node.rowIndex !== undefined) {
        updatedData[event.node.rowIndex] = { 
          ...updatedData[event.node.rowIndex], 
          [event.colDef.field || '']: event.newValue 
        };
      }
      setRowData2(updatedData);
      registerTable(table2Data, updatedData);
      
      gridRef2.current?.api.refreshCells({
        force: true,
      });

      // If table2 changes, we might need to refresh table1 if there are cross-references
      gridRef1.current?.api.refreshCells({
        force: true,
      });
    }
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

  const [rowData1, setRowData1] = useState<any[]>([
    { a: "Value 1", b: 10, c: 22, d: 44 },
    { a: "Value 2", b: 20, c: 33, d: 44 },
    { a: "Value 3", b: 30, c: 11, d: 44 },
  ]);

  const [rowData2, setRowData2] = useState<any[]>([
    { a: null, b: null },
    { a: null, b: null },
    { a: null, b: null },
  ]);
  
  // Register tables with the registry
  useEffect(() => {
    registerTable(tableData, rowData1);
    registerTable(table2Data, rowData2);
  }, [tableData, table2Data, rowData1, rowData2]);
  
  // i think we could autogenerate this to be the correct size
  return (
    <div>
      <h2>Table 1</h2>
      <div
        className="ag-theme-alpine"
        style={{ height: 300, width: "100%", marginBottom: "30px" }}
      >
        <AgGridReact
          ref={gridRef1}
          columnDefs={getColDefs(tableData.columnDefinitions, rowData1)}
          rowData={rowData1}
          defaultColDef={defaultColDef}
          modules={[ClientSideRowModelModule]}
          onCellValueChanged={onCellValueChanged}
          onCellClicked={onCellClicked}
        />
      </div>

      <h2>Table 2</h2>
      <div className="ag-theme-alpine" style={{ height: 300, width: "100%" }}>
        <AgGridReact
          ref={gridRef2}
          columnDefs={getColDefs(table2Data.columnDefinitions, rowData2)}
          rowData={rowData2}
          defaultColDef={defaultColDef}
          modules={[ClientSideRowModelModule]}
          onCellValueChanged={onCellValueChanged}
          onCellClicked={onCellClicked}
        />
      </div>
    </div>
  );
};

export default SimpleTable;
