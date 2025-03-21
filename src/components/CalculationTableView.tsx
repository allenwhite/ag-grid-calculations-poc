import React, { useState, useRef, useEffect } from "react";
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
import {
  createCCFormulaParser,
  createCCFormulaParserSingle,
} from "../calc-engine/engine/formula";
import { PageData, TableData } from "../App";

interface CalculationTableViewProps {
  tableDefinition: CalculationTable;
  pageData?: PageData;
}

const CalculationTableView: React.FC<CalculationTableViewProps> = ({
  tableDefinition,
  pageData,
}) => {
  const gridRef = useRef<AgGridReact>(null);
  const initialData: TableData = pageData
    ? pageData[tableDefinition.tableId]
    : [];

  const [rowData, setRowData] = useState<any[]>(initialData);

  const fomulaParser = pageData
    ? createCCFormulaParserSingle(tableDefinition, rowData)
    : undefined;

  const addRow = () => {
    setRowData([...rowData, { ...initialData[0] }]);
  };

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    gridRef.current?.api.refreshCells({
      force: true,
    });
  };

  const onCellClicked = (event: CellClickedEvent) => {
    if (!event.column) return;
  };

  const defaultColDef = {
    cellStyle: (params: any) => {
      return params.colDef.editable
        ? { backgroundColor: "lightgreen" }
        : { backgroundColor: "#C0C0C0" };
    },
    wrapHeaderText: true,
    headerHeight: 200,
  };

  return (
    <div
      className="ag-theme-alpine"
      style={{ height: 400, width: "90%", marginLeft: "5%" }}
    >
      <h2>{tableDefinition.description}</h2>
      {fomulaParser && (
        <AgGridReact
          ref={gridRef}
          headerHeight={200}
          columnDefs={getColDefs(
            tableDefinition,
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
      )}
      <button onClick={addRow}>Add Row</button>
    </div>
  );
};

export default CalculationTableView;

/**
 * checklist
 *
 * 1. full page refs working
 * 2. ranges working
 * 3. custom formulas
 */
