import { AgGridReact } from "@ag-grid-community/react";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import {
  CellClickedEvent,
  CellValueChangedEvent,
} from "@ag-grid-community/core";

// Import ag-Grid styles
import "@ag-grid-community/styles/ag-grid.css";
import "@ag-grid-community/styles/ag-theme-alpine.css";

import { CalcTableDefinition } from "../model/tableDefinition";
import { createCCFormulaParser } from "../calc-engine/engine/formula";
import { PageData } from "../App";

interface CalculationTableViewProps {
  tableDefinition: CalcTableDefinition;
  pageData?: PageData;
  addRow: () => void;
}

const CalculationTableView: React.FC<CalculationTableViewProps> = ({
  tableDefinition,
  pageData,
  addRow,
}) => {
  const initialData: Record<string, any>[] = pageData
    ? pageData[tableDefinition.tableId].data
    : [];

  const fomulaParser = pageData
    ? createCCFormulaParser(tableDefinition, pageData)
    : undefined;

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    if (!pageData) return;
    Object.entries(pageData).forEach(([key, value]) => {
      value.ref.current?.api.refreshCells({
        force: true,
      });
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
          ref={pageData?.[tableDefinition.tableId].ref}
          headerHeight={200}
          columnDefs={tableDefinition.getColDefs(initialData, fomulaParser)}
          rowData={initialData}
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
 * 1. full page refs working ✅
 * 2. ranges working ✅
 * 3. custom formulas
 * 4. tests
 */
