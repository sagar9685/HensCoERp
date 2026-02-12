import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCustomerLedger } from "../../features/reportSlice";
import * as XLSX from "xlsx";
import styles from "./CustomerLedger.module.css";

const CustomerLedger = () => {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { ledger, ledgerLoading, error } = useSelector((state) => state.report);

  useEffect(() => {
    dispatch(fetchCustomerLedger());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchCustomerLedger());
    setCurrentPage(1);
  };

  const handleDownload = () => {
    // Prepare data for Excel
    const excelData = ledger.data.map((item) => ({
      "Customer Name": item.CustomerName,
      "Contact Number": item.ContactNo || "N/A",
      "Area/Location": item.Area || "N/A",
      "Total Billed (Dr)": item.TotalDebit || 0,
      "Total Paid (Cr)": item.TotalCredit || 0,
      "Net Balance": item.NetBalance || 0,
    }));

    // Add summary row
    const totalDebit = ledger.data.reduce(
      (sum, row) => sum + (row.TotalDebit || 0),
      0,
    );
    const totalCredit = ledger.data.reduce(
      (sum, row) => sum + (row.TotalCredit || 0),
      0,
    );
    const totalBalance = ledger.data.reduce(
      (sum, row) => sum + (row.NetBalance || 0),
      0,
    );

    excelData.push({
      "Customer Name": "TOTAL",
      "Contact Number": "",
      "Area/Location": "",
      "Total Billed (Dr)": totalDebit,
      "Total Paid (Cr)": totalCredit,
      "Net Balance": totalBalance,
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Add column widths
    ws["!cols"] = [
      { wch: 30 }, // Customer Name
      { wch: 20 }, // Contact Number
      { wch: 25 }, // Area/Location
      { wch: 18 }, // Total Billed
      { wch: 18 }, // Total Paid
      { wch: 18 }, // Net Balance
    ];

    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Customer Ledger");

    // Generate filename with current date
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    const fileName = `customer_ledger_${dateStr}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, fileName);
  };

  const filteredData = ledger.data.filter(
    (item) =>
      item.CustomerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ContactNo?.includes(searchTerm),
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentItems = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalDebit = filteredData.reduce(
    (sum, row) => sum + (row.TotalDebit || 0),
    0,
  );
  const totalCredit = filteredData.reduce(
    (sum, row) => sum + (row.TotalCredit || 0),
    0,
  );
  const totalBalance = filteredData.reduce(
    (sum, row) => sum + (row.NetBalance || 0),
    0,
  );

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Customer Ledger</h2>
            <p className={styles.subtitle}>
              Manage and track overall customer outstanding balances
            </p>
          </div>
          <div className={styles.controls}>
            <div className={styles.searchWrapper}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search name or phone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.searchInput}
              />
            </div>
            <button onClick={handleDownload} className={styles.downloadBtn}>
              📥 Download Excel
            </button>
            <button onClick={handleRefresh} className={styles.refreshBtn}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {ledgerLoading ? (
          <div className={styles.loaderContainer}>
            <div className={styles.loader}></div>
            <p>Syncing Financials...</p>
          </div>
        ) : error ? (
          <div className={styles.errorCard}>⚠️ {error}</div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Customer Details</th>
                    <th>Location</th>
                    <th className={styles.textRight}>Total Billed (Dr)</th>
                    <th className={styles.textRight}>Total Paid (Cr)</th>
                    <th className={styles.textRight}>Net Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className={styles.custName}>
                            {row.CustomerName}
                          </div>
                          <div className={styles.custPhone}>
                            {row.ContactNo}
                          </div>
                        </td>
                        <td>
                          <span className={styles.areaBadge}>
                            {row.Area || "N/A"}
                          </span>
                        </td>
                        <td
                          className={`${styles.textRight} ${styles.weight600}`}
                        >
                          ₹{row.TotalDebit?.toLocaleString("en-IN")}
                        </td>
                        <td
                          className={`${styles.textRight} ${styles.creditText}`}
                        >
                          ₹{row.TotalCredit?.toLocaleString("en-IN")}
                        </td>
                        <td className={styles.textRight}>
                          <span
                            className={
                              row.NetBalance > 0
                                ? styles.amtRed
                                : styles.amtGreen
                            }
                          >
                            ₹{row.NetBalance?.toLocaleString("en-IN")}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className={styles.noData}>
                        No records matching your search
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.tableFooterInfo}>
              <div className={styles.statsSummary}>
                <div className={styles.statItem}>
                  Total Dr: <span>₹{totalDebit.toLocaleString("en-IN")}</span>
                </div>
                <div className={styles.statItem}>
                  Total Cr: <span>₹{totalCredit.toLocaleString("en-IN")}</span>
                </div>
                <div className={styles.statItem}>
                  Net:{" "}
                  <span
                    className={
                      totalBalance > 0 ? styles.textRed : styles.textGreen
                    }
                  >
                    ₹{totalBalance.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className={styles.pageBtn}
                  >
                    Previous
                  </button>
                  <span className={styles.pageInfo}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className={styles.pageBtn}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerLedger;
