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
  setPageData: (pageData: PageData) => void;
  fomulaParser: FormulaParser;
  addRow: (tableIds: string[]) => void;
}

const CalculationTableView: React.FC<CalculationTableViewProps> = ({
  tableDefinition,
  pageData,
  setPageData,
  fomulaParser,
  addRow,
}) => {
  const initialData: Record<string, any>[] = pageData
    ? pageData[tableDefinition.tableId].data
    : [];

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    // we should have an actual table dependency structure here to iterate over.
    // , which should exist in the response. In my case, im just hard coding it.
    const dependencyOrder = [
      "Method2_3Table1",
      "Method2_3RefTable",
      "Method2_3Table2",
    ];
    dependencyOrder.forEach((dependency) => {
      pageData[dependency].ref?.current?.api.refreshCells({
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
      style={{
        height: tableDefinition.type === "reference" ? "auto" : "400px",
        display: "block",
        width: "90%",
        marginLeft: "5%",
      }}
    >
      <h2>
        {tableDefinition.description}
        {tableDefinition.type === "reference" ? " (HIDDEN)" : ""}
      </h2>
      {fomulaParser && (
        <AgGridReact
          ref={pageData?.[tableDefinition.tableId].ref}
          headerHeight={200}
          columnDefs={tableDefinition.getColDefs(
            pageData,
            setPageData,
            fomulaParser
          )}
          rowData={initialData}
          defaultColDef={defaultColDef}
          modules={[ClientSideRowModelModule]}
          onCellValueChanged={onCellValueChanged}
          onCellClicked={onCellClicked}
        />
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
