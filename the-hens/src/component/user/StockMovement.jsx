import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchStockMovement } from "../../features/stockSlice";
import * as XLSX from "xlsx"; // Import xlsx
import styles from "./StockMovement.module.css";
import UserSideBar from "./UserSidebar";
import UserNavbar from "./UserNavbar";

const StockMovementReport = () => {
  const dispatch = useDispatch();
  const { movementReport, loading } = useSelector((state) => state.stock);

  console.log(movementReport, "stock report");

  const today = new Date().toISOString().split("T")[0];
  const [dates, setDates] = useState({ fromDate: today, toDate: today });

  useEffect(() => {
    handleFetch();
  }, []);

  const handleFetch = () => {
    dispatch(fetchStockMovement(dates));
  };

  // --- Excel Export Logic ---
  const exportToExcel = () => {
    if (movementReport.length === 0) {
      alert("No data available to export");
      return;
    }

    // 1. Prepare the report info (Date Range)
    const reportInfo = [
      ["Stock Movement Report"],
      [`From Date:`, dates.fromDate],
      [`To Date:`, dates.toDate],
      [], // Empty row for spacing
    ];

    // 2. Prepare the Table Data
    const tableHeaders = [
      "Product Name",
      "Opening Stock",
      "Total Inward (+)",
      "Total Sold (-)",
      "Closing Stock",
    ];

    const tableRows = movementReport.map((item) => [
      item.ProductType,
      item.Opening,
      item.Total_In,
      item.Total_Sell,
      item.Closing,
    ]);

    // 3. Combine everything
    const finalData = [...reportInfo, tableHeaders, ...tableRows];

    // 4. Create Worksheet and Workbook
    const worksheet = XLSX.utils.aoa_to_sheet(finalData); // aoa_to_sheet handles arrays
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Movement");

    // Optional: Set column widths for better visibility
    const wscols = [
      { wch: 25 }, // Product Name
      { wch: 15 }, // Opening
      { wch: 15 }, // Total In
      { wch: 15 }, // Total Sold
      { wch: 15 }, // Closing
    ];
    worksheet["!cols"] = wscols;

    // 5. Save the file
    XLSX.writeFile(
      workbook,
      `Stock_Report_${dates.fromDate}_to_${dates.toDate}.xlsx`,
    );
  };

  return (
    <div className="container-scroller">
      <UserSideBar />
      <div className="container-fluid page-body-wrapper">
        <UserNavbar />
        <div className="main-panel">
          <div className="content-wrapper">
            <div className={styles.container}>
              <div className={styles.header}>
                <h3 className="page-title">Stock Movement Report</h3>
                <div className={styles.filterGroup}>
                  <div className={styles.inputWrapper}>
                    <label>From:</label>
                    <input
                      type="date"
                      value={dates.fromDate}
                      onChange={(e) =>
                        setDates({ ...dates, fromDate: e.target.value })
                      }
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <label>To:</label>
                    <input
                      type="date"
                      value={dates.toDate}
                      onChange={(e) =>
                        setDates({ ...dates, toDate: e.target.value })
                      }
                    />
                  </div>

                  <button
                    className="btn btn-primary btn-icon-text"
                    onClick={handleFetch}
                    disabled={loading}
                  >
                    <i className="mdi mdi-file-find btn-icon-prepend"></i>
                    {loading ? "Loading..." : "Generate Report"}
                  </button>

                  {/* Export Button */}
                  <button
                    className="btn btn-success btn-icon-text"
                    onClick={exportToExcel}
                    style={{ marginLeft: "10px" }}
                  >
                    <i className="mdi mdi-microsoft-excel btn-icon-prepend"></i>
                    Export Excel
                  </button>
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.reportTable}>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Opening</th>
                      <th className={styles.inflow}>Total In (+)</th>
                      <th className={styles.outflow}>Total Sold (-)</th>
                      <th>Closing (Dashboard)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(movementReport) &&
                    movementReport.length > 0 ? (
                      movementReport.map((item, index) => (
                        <tr key={index}>
                          <td className={styles.productName}>
                            {item.ProductType}
                          </td>
                          <td>{item.Opening}</td>
                          <td className={styles.inflowText}>{item.Total_In}</td>
                          <td className={styles.outflowText}>
                            {item.Total_Sell}
                          </td>
                          <td className={styles.closingText}>
                            <span>{item.Closing}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="5"
                          style={{ textAlign: "center", padding: "20px" }}
                        >
                          No data found for the selected dates.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockMovementReport;
