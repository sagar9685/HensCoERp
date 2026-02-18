import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchStockMovement } from "../../features/stockSlice";
import styles from "./StockMovement.module.css";
import UserSideBar from "./UserSidebar";
import UserNavbar from "./UserNavbar";

const StockMovementReport = () => {
  const dispatch = useDispatch();
  const { movementReport, loading } = useSelector((state) => state.stock);

  // Default date: Today
  const today = new Date().toISOString().split("T")[0];
  const [dates, setDates] = useState({ fromDate: today, toDate: today });

  useEffect(() => {
    handleFetch();
  }, []);

  const handleFetch = () => {
    dispatch(fetchStockMovement(dates));
  };

  return (
    <div className="container-scroller">
      <UserSideBar />
      <div className="container-fluid page-body-wrapper">
        <UserNavbar />
        <div className="main-panel">
          <div className="content-wrapper">
            <div className={styles.container}>
              {/* Header Section */}
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
                </div>
              </div>

              {/* Table Section */}
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
                    {movementReport.length > 0 ? (
                      movementReport.map((item, index) => (
                        <tr key={index}>
                          <td className={styles.productName}>
                            {item.ProductType}
                          </td>
                          <td>{item.Opening}</td>
                          <td className={styles.inflowText}>{item.Total_In}</td>
                          <td className={styles.outflowText}>
                            {item.Total_Sold}
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
