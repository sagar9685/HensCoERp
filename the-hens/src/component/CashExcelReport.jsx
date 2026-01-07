import React from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const ExcelReport = ({
  filteredAndSortedList,
  fileName = "export.xlsx",
  children,
}) => {
  const handleExport = () => {
    if (!filteredAndSortedList || filteredAndSortedList.length === 0) {
      alert("No data available to export");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(filteredAndSortedList);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const file = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(file, fileName);
  };

  return <div onClick={handleExport}>{children}</div>;
};

export default ExcelReport;
