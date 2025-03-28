import { AgGridReact } from "@ag-grid-community/react";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import {
  CellClickedEvent,
  CellValueChangedEvent,
} from "@ag-grid-community/core";

// Import ag-Grid styles
import "@ag-grid-community/styles/ag-grid.css";
import "@ag-grid-community/styles/ag-theme-alpine.css";

import { CalcTableDefinition, PageData } from "../model/tableDefinition";
import FormulaParser from "fast-formula-parser";

interface CalculationTableViewProps {
  tableDefinition: CalcTableDefinition;
  pageData: PageData;
  fomulaParser: FormulaParser;
  addRow: (tableIds: string[]) => void;
}

const CalculationTableView: React.FC<CalculationTableViewProps> = ({
  tableDefinition,
  pageData,
  fomulaParser,
  addRow,
}) => {
  const initialData: Record<string, any>[] = pageData
    ? pageData[tableDefinition.tableId].data
    : [];

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    Object.entries(pageData).forEach(([key, value]) => {
      value.ref?.current?.api.refreshCells({
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
      <h2>
        {tableDefinition.description}
        {tableDefinition.type === "reference" ? " (HIDDEN)" : ""}
      </h2>
      {fomulaParser && (
        <div
          style={{
            height: tableDefinition.type === "reference?" ? "auto" : "400px",
            display: tableDefinition.type === "reference?" ? "none" : "block",
          }}
        >
          <AgGridReact
            ref={pageData?.[tableDefinition.tableId].ref}
            headerHeight={200}
            columnDefs={tableDefinition.getColDefs(pageData, fomulaParser)}
            rowData={initialData}
            defaultColDef={defaultColDef}
            modules={[ClientSideRowModelModule]}
            onCellValueChanged={onCellValueChanged}
            onCellClicked={onCellClicked}
          />
        </div>
      )}
      {tableDefinition.type === "entry" && (
        <button
          onClick={() =>
            addRow([
              tableDefinition.tableId,
              ...(tableDefinition.dependentTables || []),
            ])
          }
        >
          Add Row
        </button>
      )}
    </div>
  );
};

export default CalculationTableView;
