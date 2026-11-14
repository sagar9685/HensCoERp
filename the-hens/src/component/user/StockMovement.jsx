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

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    handleFetch();
  }, []);

  const handleFetch = () => {
    dispatch(fetchStockMovement(dates));
  };

  // --- Excel Export Logic ---

  const exportToExcel = async () => {
    if (exporting) return;

    if (!dates.fromDate || !dates.toDate || dates.fromDate > dates.toDate) {
      alert("Please select a valid date range.");
      return;
    }

    setExporting(true);

    try {
      const workbook = XLSX.utils.book_new();
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

      const start = new Date(`${dates.fromDate}T00:00:00Z`);
      const end = new Date(`${dates.toDate}T00:00:00Z`);

      const dateList = [];

      for (
        let d = new Date(start);
        d <= end;
        d.setUTCDate(d.getUTCDate() + 1)
      ) {
        dateList.push(d.toISOString().slice(0, 10));
      }

      const fetchDay = async (currentDate) => {
        const params = new URLSearchParams({
          fromDate: currentDate,
          toDate: currentDate,
        });

        const res = await fetch(`${API_BASE_URL}/api/stock/report?${params}`);

        if (!res.ok) {
          throw new Error(`Failed for ${currentDate}`);
        }

        const data = await res.json();

        if (!Array.isArray(data)) {
          throw new Error(`Invalid response for ${currentDate}`);
        }

        return data;
      };

      let exportedSheets = 0;

      // Maximum 5 requests at a time
      for (let i = 0; i < dateList.length; i += 5) {
        const batch = dateList.slice(i, i + 5);
        const results = await Promise.all(batch.map(fetchDay));

        results.forEach((data, index) => {
          if (!data.length) return;

          const currentDate = batch[index];

          const sheetData = [
            [`Stock Movement Report - ${currentDate}`],
            [],
            [
              "Product Name",
              "Opening",
              "Total In",
              "Total Sold",
              "Rejected",
              "Closing",
            ],
            ...data.map((item) => [
              item.ProductType,
              Number(item.Opening || 0),
              Number(item.Total_In || 0),
              Number(item.Total_Sell || 0),
              Number(item.Total_Rejected || 0),
              Number(item.Closing || 0),
            ]),
          ];

          const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

          worksheet["!cols"] = [
            { wch: 25 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
          ];

          XLSX.utils.book_append_sheet(workbook, worksheet, currentDate);

          exportedSheets++;
        });
      }

      if (!exportedSheets) {
        alert("No stock movement data found.");
        return;
      }

      XLSX.writeFile(
        workbook,
        `Stock_Report_${dates.fromDate}_to_${dates.toDate}.xlsx`,
      );
    } catch (error) {
      console.error("EXCEL EXPORT ERROR:", error);
      alert("Excel export failed. Please try again.");
    } finally {
      setExporting(false);
    }
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
                    disabled={exporting || loading}
                    style={{ marginLeft: "10px" }}
                  >
                    <i className="mdi mdi-microsoft-excel btn-icon-prepend"></i>
                    {exporting ? "Exporting..." : "Export Excel"}
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
                      <th>Rejected (-)</th>
                      <th>Closing Stock</th>
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

                          <td style={{ color: "#dc3545", fontWeight: 600 }}>
                            {item.Total_Rejected ?? 0}
                          </td>

                          <td className={styles.closingText}>
                            <span>{item.Closing}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: "center",
                            padding: "20px",
                          }}
                        >
                          {loading
                            ? "Loading stock movement..."
                            : "No data found for the selected dates."}
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
