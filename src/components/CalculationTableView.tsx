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

import { CalculationTable, getColDefs } from "../model/tableDefinition";
import { createFormulaParser } from "../calc-engine/engine/formula";
import { PageData } from "../App";

interface CalculationTableViewProps {
  tableData: CalculationTable;
  pageData?: PageData;
}

const CalculationTableView: React.FC<CalculationTableViewProps> = ({
  tableData,
  pageData,
}) => {
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<any[]>([pageData]);
  const fomulaParser = createFormulaParser(rowData);

  const addRow = () => {
    setRowData([...rowData, { ...pageData }]);
  };

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    gridRef.current?.api.refreshCells({
      force: true,
    });
  };

  const onCellClicked = (event: CellClickedEvent) => {
    if (!event.column) return;
  };

  // move to another file?
  const defaultColDef = {
    cellStyle: (params: any) => {
      return params.colDef.editable
        ? { backgroundColor: "lightgreen" }
        : { backgroundColor: "lightgray" };
    },
    wrapHeaderText: true,
    headerHeight: 200,
  };

  return (
    <div
      className="ag-theme-alpine"
      style={{ height: 400, width: "90%", marginLeft: "5%" }}
    >
      <h2>{tableData.description}</h2>
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

export default CalculationTableView;
