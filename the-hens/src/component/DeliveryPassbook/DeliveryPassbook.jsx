import { useEffect, useMemo, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import * as XLSX from "xlsx";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  clearPassbook,
  fetchDeliveryBoyPassbook,
  fetchDeliveryCashAccounts,
  fetchDeliveryPassbookExport,
} from "../../features/deliveryPassbookSlice";

import styles from "./DeliveryPassbook.module.css";

import UserSideBar from "../user/UserSidebar";
import UserNavbar from "../user/UserNavBar";

// =====================================================
// HELPERS
// =====================================================

const money = (value) => {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// PDF built-in font me ₹ issue aa sakta hai,
// isliye PDF ke liye Rs. use karenge.
const pdfMoney = (value) => {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const excelNumber = (value) => {
  return Number(value || 0);
};

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateOnly = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const sanitizeFileName = (value = "") => {
  return String(value)
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_")
    .trim();
};

// =====================================================
// COMPONENT
// =====================================================

const DeliveryPassbook = () => {
  const dispatch = useDispatch();

  const {
    accounts,
    accountsLoading,
    accountsError,

    deliveryMan,
    summary,
    openingEntry,
    transactions,

    filter,
    pagination,

    passbookLoading,
    passbookError,

    exportLoading,
    exportError,
  } = useSelector((state) => state.deliveryPassbook);

  // =====================================================
  // LOCAL STATE
  // =====================================================

  const [selectedDeliveryMan, setSelectedDeliveryMan] = useState("");

  const [fromDate, setFromDate] = useState("");

  const [toDate, setToDate] = useState("");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [limit, setLimit] = useState(20);

  const [exportType, setExportType] = useState("");

  // =====================================================
  // LOAD DELIVERY BOYS
  // =====================================================

  useEffect(() => {
    dispatch(
      fetchDeliveryCashAccounts({
        isActive: 1,
      }),
    )
      .unwrap()
      .catch((error) => {
        console.error("DELIVERY ACCOUNTS ERROR:", error);
      });
  }, [dispatch]);

  // =====================================================
  // FETCH PASSBOOK
  // =====================================================

  const loadPassbook = ({
    deliveryManId = selectedDeliveryMan,

    pageNumber = page,

    pageLimit = limit,

    startDate = fromDate,

    endDate = toDate,
  } = {}) => {
    if (!deliveryManId) return;

    dispatch(
      fetchDeliveryBoyPassbook({
        deliveryManId,

        fromDate: startDate,

        toDate: endDate,

        page: pageNumber,

        limit: pageLimit,
      }),
    );
  };

  // =====================================================
  // DELIVERY MAN CHANGE
  // =====================================================

  const handleDeliveryManChange = (e) => {
    const id = e.target.value;

    setSelectedDeliveryMan(id);

    setPage(1);

    if (!id) {
      dispatch(clearPassbook());
      return;
    }

    loadPassbook({
      deliveryManId: id,
      pageNumber: 1,
    });
  };

  // =====================================================
  // APPLY FILTER
  // =====================================================

  const handleFilter = () => {
    if (!selectedDeliveryMan) {
      return;
    }

    if (fromDate && toDate && fromDate > toDate) {
      alert("From Date cannot be greater than To Date");

      return;
    }

    setPage(1);

    loadPassbook({
      pageNumber: 1,
    });
  };

  // =====================================================
  // RESET
  // =====================================================

  const handleReset = () => {
    setFromDate("");
    setToDate("");
    setPage(1);

    if (selectedDeliveryMan) {
      loadPassbook({
        pageNumber: 1,
        startDate: "",
        endDate: "",
      });
    }
  };

  // =====================================================
  // PAGINATION
  // =====================================================

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === page) {
      return;
    }

    setPage(newPage);

    loadPassbook({
      pageNumber: newPage,
    });
  };

  const handleLimitChange = (e) => {
    const newLimit = Number(e.target.value);

    setLimit(newLimit);

    setPage(1);

    if (selectedDeliveryMan) {
      loadPassbook({
        pageNumber: 1,
        pageLimit: newLimit,
      });
    }
  };

  // =====================================================
  // SEARCH DELIVERY BOY
  // =====================================================

  const filteredAccounts = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return accounts;
    }

    return accounts.filter((item) => {
      return (
        item.Name?.toLowerCase().includes(value) ||
        item.Area?.toLowerCase().includes(value) ||
        item.MobileNo?.toLowerCase().includes(value)
      );
    });
  }, [accounts, search]);

  // =====================================================
  // GET COMPLETE EXPORT DATA
  // =====================================================

  const getExportData = async () => {
    if (!selectedDeliveryMan) {
      alert("Please select a delivery boy first.");

      return null;
    }

    try {
      const response = await dispatch(
        fetchDeliveryPassbookExport({
          deliveryManId: selectedDeliveryMan,

          // IMPORTANT:
          // Export wahi applied filter karega
          // jo currently statement me hai.
          fromDate: filter?.fromDate || "",

          toDate: filter?.toDate || "",
        }),
      ).unwrap();

      return response;
    } catch (error) {
      console.error("Export error:", error);

      alert(error || "Unable to export passbook.");

      return null;
    }
  };

  // =====================================================
  // EXPORT EXCEL
  // =====================================================

  const handleExportExcel = async () => {
    try {
      setExportType("excel");

      const data = await getExportData();

      if (!data) return;

      const exportDeliveryMan = data.deliveryMan || {};

      const exportSummary = data.summary || {};

      const exportOpening = data.openingEntry || {};

      const exportTransactions = data.transactions || [];

      const appliedFrom = data.filter?.fromDate;

      const appliedTo = data.filter?.toDate;

      const periodText =
        appliedFrom || appliedTo
          ? `${formatDateOnly(appliedFrom)} To ${formatDateOnly(appliedTo)}`
          : "All Transactions";

      // ===============================================
      // EXCEL ROWS
      // ===============================================

      const rows = [
        ["DELIVERY CASH PASSBOOK"],

        [],

        [
          "Delivery Boy",
          exportDeliveryMan.name || "-",
          "Delivery Man ID",
          exportDeliveryMan.deliveryManId || "-",
        ],

        [
          "Area",
          exportDeliveryMan.area || "-",
          "Mobile",
          exportDeliveryMan.mobileNo || "-",
        ],

        ["Statement Period", periodText],

        ["Generated On", new Date().toLocaleString("en-IN")],

        [],

        [
          "Opening Balance",
          excelNumber(exportSummary.openingBalance),

          "Total Cash Received (CR)",
          excelNumber(exportSummary.totalCredit),

          "Total Handover (DR)",
          excelNumber(exportSummary.totalDebit),

          "Closing Balance",
          excelNumber(exportSummary.closingBalance),
        ],

        ["Current Cash In Hand", excelNumber(exportSummary.currentBalance)],

        [],

        [
          "#",
          "Date",
          "Particulars",
          "Order / Reference",
          "Customer",
          "Debit (DR)",
          "Credit (CR)",
          "Balance",
        ],
      ];

      // ===============================================
      // OPENING BALANCE
      // ===============================================

      rows.push([
        "",
        "",
        exportOpening.particulars || "Opening Balance",
        "",
        "",
        "",
        "",
        excelNumber(exportOpening.balance),
      ]);

      // ===============================================
      // TRANSACTIONS
      // ===============================================

      exportTransactions.forEach((item) => {
        const reference =
          item.TransactionSource === "ORDER_CASH"
            ? `Order #${item.OrderID || ""}${
                item.InvoiceNo ? ` / ${item.InvoiceNo}` : ""
              }`
            : `Handover #${item.SourceId}`;

        rows.push([
          item.RowNumber || "",
          formatDate(item.TransactionDate),
          item.Particulars || "",
          reference,
          item.CustomerName || "-",
          excelNumber(item.Debit),
          excelNumber(item.Credit),
          excelNumber(item.RunningBalance),
        ]);
      });

      // ===============================================
      // CREATE SHEET
      // ===============================================

      const worksheet = XLSX.utils.aoa_to_sheet(rows);

      // Title merge
      worksheet["!merges"] = [
        {
          s: {
            r: 0,
            c: 0,
          },

          e: {
            r: 0,
            c: 7,
          },
        },
      ];

      // Column widths
      worksheet["!cols"] = [
        {
          wch: 8,
        },
        {
          wch: 21,
        },
        {
          wch: 48,
        },
        {
          wch: 30,
        },
        {
          wch: 25,
        },
        {
          wch: 16,
        },
        {
          wch: 16,
        },
        {
          wch: 18,
        },
      ];

      // Currency number format
      const range = XLSX.utils.decode_range(worksheet["!ref"]);

      for (let row = 0; row <= range.e.r; row++) {
        [5, 6, 7].forEach((column) => {
          const cellAddress = XLSX.utils.encode_cell({
            r: row,
            c: column,
          });

          const cell = worksheet[cellAddress];

          if (cell && typeof cell.v === "number") {
            cell.z = "₹#,##0.00";
          }
        });
      }

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Cash Passbook");

      const fileName = sanitizeFileName(
        `${exportDeliveryMan.name || "Delivery_Boy"}_Cash_Passbook`,
      );

      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } catch (error) {
      console.error("Excel Export Error:", error);

      alert("Failed to export Excel.");
    } finally {
      setExportType("");
    }
  };

  // =====================================================
  // EXPORT PDF
  // =====================================================

  const handleExportPDF = async () => {
    try {
      setExportType("pdf");

      const data = await getExportData();

      if (!data) return;

      const exportDeliveryMan = data.deliveryMan || {};

      const exportSummary = data.summary || {};

      const exportOpening = data.openingEntry || {};

      const exportTransactions = data.transactions || [];

      const appliedFrom = data.filter?.fromDate;

      const appliedTo = data.filter?.toDate;

      const periodText =
        appliedFrom || appliedTo
          ? `${formatDateOnly(appliedFrom)} - ${formatDateOnly(appliedTo)}`
          : "All Transactions";

      // Landscape is better for passbook table
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // ===============================================
      // HEADER
      // ===============================================

      doc.setFont("helvetica", "bold");

      doc.setFontSize(18);

      doc.text("DELIVERY CASH PASSBOOK", 14, 15);

      doc.setFont("helvetica", "normal");

      doc.setFontSize(9);

      doc.text(`Delivery Boy: ${exportDeliveryMan.name || "-"}`, 14, 23);

      doc.text(
        `Delivery Man ID: #${exportDeliveryMan.deliveryManId || "-"}`,
        95,
        23,
      );

      doc.text(`Area: ${exportDeliveryMan.area || "-"}`, 170, 23);

      doc.text(`Mobile: ${exportDeliveryMan.mobileNo || "-"}`, 230, 23);

      doc.text(`Statement Period: ${periodText}`, 14, 29);

      doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 170, 29);

      // ===============================================
      // SUMMARY
      // ===============================================

      autoTable(doc, {
        startY: 35,

        head: [
          [
            "Opening Balance",
            "Cash Received (CR)",
            "Cash Handover (DR)",
            "Closing Balance",
            "Current Cash In Hand",
          ],
        ],

        body: [
          [
            pdfMoney(exportSummary.openingBalance),

            pdfMoney(exportSummary.totalCredit),

            pdfMoney(exportSummary.totalDebit),

            pdfMoney(exportSummary.closingBalance),

            pdfMoney(exportSummary.currentBalance),
          ],
        ],

        theme: "grid",

        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 3,
          halign: "center",
        },

        headStyles: {
          fontStyle: "bold",
        },
      });

      // ===============================================
      // TABLE DATA
      // ===============================================

      const pdfRows = [];

      pdfRows.push([
        "",
        "",
        exportOpening.particulars || "Opening Balance",
        "",
        "",
        "",
        "",
        pdfMoney(exportOpening.balance),
      ]);

      exportTransactions.forEach((item) => {
        const reference =
          item.TransactionSource === "ORDER_CASH"
            ? `Order #${item.OrderID || ""}${
                item.InvoiceNo ? `\n${item.InvoiceNo}` : ""
              }`
            : `Handover #${item.SourceId}`;

        pdfRows.push([
          item.RowNumber || "",

          formatDate(item.TransactionDate),

          item.Particulars || "",

          reference,

          item.CustomerName || "-",

          Number(item.Debit || 0) > 0 ? pdfMoney(item.Debit) : "-",

          Number(item.Credit || 0) > 0 ? pdfMoney(item.Credit) : "-",

          pdfMoney(item.RunningBalance),
        ]);
      });

      // ===============================================
      // PASSBOOK TABLE
      // ===============================================

      autoTable(doc, {
        startY: doc.lastAutoTable?.finalY + 7 || 55,

        head: [
          [
            "#",
            "Date",
            "Particulars",
            "Order / Ref.",
            "Customer",
            "Debit (DR)",
            "Credit (CR)",
            "Balance",
          ],
        ],

        body: pdfRows,

        theme: "grid",

        styles: {
          font: "helvetica",
          fontSize: 7,
          cellPadding: 2.2,
          valign: "middle",
          overflow: "linebreak",
        },

        headStyles: {
          fontStyle: "bold",
          halign: "center",
        },

        columnStyles: {
          0: {
            cellWidth: 10,
            halign: "center",
          },

          1: {
            cellWidth: 30,
          },

          2: {
            cellWidth: 61,
          },

          3: {
            cellWidth: 40,
          },

          4: {
            cellWidth: 38,
          },

          5: {
            cellWidth: 28,
            halign: "right",
          },

          6: {
            cellWidth: 28,
            halign: "right",
          },

          7: {
            cellWidth: 28,
            halign: "right",
            fontStyle: "bold",
          },
        },

        margin: {
          left: 14,
          right: 14,
        },

        didDrawPage: () => {
          const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;

          const pageWidth = doc.internal.pageSize.getWidth();

          const pageHeight = doc.internal.pageSize.getHeight();

          doc.setFontSize(7);

          doc.setFont("helvetica", "normal");

          doc.text(
            `Delivery Cash Passbook - ${exportDeliveryMan.name || ""}`,
            14,
            pageHeight - 6,
          );

          doc.text(`Page ${pageNumber}`, pageWidth - 27, pageHeight - 6);
        },
      });

      // ===============================================
      // SAVE PDF
      // ===============================================

      const fileName = sanitizeFileName(
        `${exportDeliveryMan.name || "Delivery_Boy"}_Cash_Passbook`,
      );

      doc.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);

      alert("Failed to export PDF.");
    } finally {
      setExportType("");
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="container-scroller">
      <UserSideBar />

      <div className="container-fluid page-body-wrapper">
        <UserNavbar />

        <div className={styles.page}>
          {/* =================================================
              HEADER
          ================================================= */}

          <div className={styles.pageHeader}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIcon}>
                <i className="mdi mdi-book-open-page-variant"></i>
              </div>

              <div>
                <div className={styles.breadcrumb}>
                  Accounts
                  <span>/</span>
                  Delivery Management
                </div>

                <h1 className={styles.title}>Delivery Cash Passbook</h1>

                <p className={styles.subtitle}>
                  Track cash collections, company handovers and delivery boy
                  balances.
                </p>
              </div>
            </div>

            <div className={styles.headerBadge}>
              <i className="mdi mdi-shield-check-outline"></i>
              Live Cash Ledger
            </div>
          </div>

          {/* =================================================
              FILTER
          ================================================= */}

          <div className={styles.filterCard}>
            <div className={styles.filterGrid}>
              <div className={styles.formGroup}>
                <label>Search Delivery Boy</label>

                <input
                  type="text"
                  value={search}
                  placeholder="Search name, area or mobile..."
                  onChange={(e) => setSearch(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Delivery Boy</label>

                <select
                  className={styles.select}
                  value={selectedDeliveryMan}
                  onChange={handleDeliveryManChange}
                  disabled={accountsLoading}
                >
                  <option value="">
                    {accountsLoading ? "Loading..." : "Select Delivery Boy"}
                  </option>

                  {filteredAccounts.map((item) => (
                    <option key={item.DeliveryManID} value={item.DeliveryManID}>
                      {item.Name} - {item.Area || "No Area"} -{" "}
                      {money(item.CurrentBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>From Date</label>

                <input
                  type="date"
                  className={styles.input}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>To Date</label>

                <input
                  type="date"
                  className={styles.input}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>

              <div className={styles.filterActions}>
                <button
                  className={styles.primaryButton}
                  onClick={handleFilter}
                  disabled={!selectedDeliveryMan || passbookLoading}
                >
                  Apply Filter
                </button>

                <button
                  className={styles.secondaryButton}
                  onClick={handleReset}
                  disabled={!selectedDeliveryMan}
                >
                  Reset
                </button>
              </div>
            </div>

            {accountsError && (
              <div className={styles.errorMessage}>{accountsError}</div>
            )}
          </div>

          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {!selectedDeliveryMan && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIllustration}>
                <div className={styles.emptyIcon}>
                  <i className="mdi mdi-account-cash-outline"></i>
                </div>

                <div className={styles.emptyMiniIcon}>
                  <i className="mdi mdi-book-open-page-variant"></i>
                </div>
              </div>

              <h3>Select a Delivery Boy</h3>

              <p>
                Choose a delivery boy above to view cash received, handovers and
                running balance.
              </p>

              <div className={styles.emptyHints}>
                <span>
                  <i className="mdi mdi-arrow-down-bold-circle-outline"></i>
                  Cash Received = CR
                </span>

                <span>
                  <i className="mdi mdi-arrow-up-bold-circle-outline"></i>
                  Cash Handover = DR
                </span>
              </div>
            </div>
          )}

          {/* =================================================
              LOADING
          ================================================= */}

          {selectedDeliveryMan && passbookLoading && (
            <div className={styles.loadingBox}>
              <div className={styles.spinner}></div>

              <span>Loading passbook...</span>
            </div>
          )}

          {/* =================================================
              ERROR
          ================================================= */}

          {selectedDeliveryMan && !passbookLoading && passbookError && (
            <div className={styles.errorBox}>{passbookError}</div>
          )}

          {exportError && (
            <div className={styles.exportError}>{exportError}</div>
          )}

          {/* =================================================
              PASSBOOK
          ================================================= */}

          {selectedDeliveryMan &&
            !passbookLoading &&
            !passbookError &&
            deliveryMan && (
              <>
                {/* =============================================
                    DELIVERY MAN DETAILS
                ============================================= */}

                <div className={styles.profileCard}>
                  <div className={styles.avatar}>
                    {deliveryMan.name?.charAt(0)?.toUpperCase()}
                  </div>

                  <div className={styles.profileInfo}>
                    <h2>{deliveryMan.name}</h2>

                    <div className={styles.profileMeta}>
                      <span>ID: #{deliveryMan.deliveryManId}</span>

                      <span>{deliveryMan.area || "No Area"}</span>

                      <span>{deliveryMan.mobileNo || "No Mobile"}</span>
                    </div>
                  </div>

                  <div className={styles.currentBalanceBox}>
                    <span>Cash In Hand</span>

                    <strong>{money(deliveryMan.currentBalance)}</strong>
                  </div>
                </div>

                {/* =============================================
                    SUMMARY
                ============================================= */}

                <div className={styles.summaryGrid}>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryLabel}>Opening Balance</div>

                    <div className={styles.summaryValue}>
                      {money(summary?.openingBalance)}
                    </div>

                    <div className={styles.summaryDescription}>
                      Balance before selected period
                    </div>
                  </div>

                  <div className={`${styles.summaryCard} ${styles.creditCard}`}>
                    <div className={styles.summaryLabel}>
                      Total Cash Received
                    </div>

                    <div className={styles.creditValue}>
                      + {money(summary?.totalCredit)}
                    </div>

                    <div className={styles.summaryDescription}>Credit (CR)</div>
                  </div>

                  <div className={`${styles.summaryCard} ${styles.debitCard}`}>
                    <div className={styles.summaryLabel}>Total Handover</div>

                    <div className={styles.debitValue}>
                      - {money(summary?.totalDebit)}
                    </div>

                    <div className={styles.summaryDescription}>Debit (DR)</div>
                  </div>

                  <div className={styles.summaryCard}>
                    <div className={styles.summaryLabel}>Closing Balance</div>

                    <div className={styles.summaryValue}>
                      {money(summary?.closingBalance)}
                    </div>

                    <div className={styles.summaryDescription}>
                      Closing cash balance
                    </div>
                  </div>

                  <div className={styles.summaryCard}>
                    <div className={styles.summaryLabel}>Current Balance</div>

                    <div className={styles.currentValue}>
                      {money(summary?.currentBalance)}
                    </div>

                    <div className={styles.summaryDescription}>
                      Current cash in hand
                    </div>
                  </div>
                </div>

                {/* =============================================
                    TABLE
                ============================================= */}

                <div className={styles.tableCard}>
                  <div className={styles.tableHeader}>
                    <div>
                      <h3>Cash Statement</h3>

                      <p>{pagination.totalRecords || 0} transactions</p>
                    </div>

                    <div className={styles.tableHeaderActions}>
                      {/* =====================================
                          EXPORT BUTTONS
                      ===================================== */}

                      <div className={styles.exportButtons}>
                        <button
                          type="button"
                          className={`${styles.exportButton} ${styles.excelButton}`}
                          onClick={handleExportExcel}
                          disabled={exportLoading}
                        >
                          {exportType === "excel" && exportLoading ? (
                            <span className={styles.buttonLoader}></span>
                          ) : (
                            <i className="mdi mdi-file-excel-outline"></i>
                          )}

                          {exportType === "excel" && exportLoading
                            ? "Exporting..."
                            : "Excel"}
                        </button>

                        <button
                          type="button"
                          className={`${styles.exportButton} ${styles.pdfButton}`}
                          onClick={handleExportPDF}
                          disabled={exportLoading}
                        >
                          {exportType === "pdf" && exportLoading ? (
                            <span className={styles.buttonLoader}></span>
                          ) : (
                            <i className="mdi mdi-file-pdf-box"></i>
                          )}

                          {exportType === "pdf" && exportLoading
                            ? "Exporting..."
                            : "PDF"}
                        </button>
                      </div>

                      {/* =====================================
                          PAGE LIMIT
                      ===================================== */}

                      <div className={styles.recordLimit}>
                        <span>Show</span>

                        <select
                          value={limit}
                          onChange={handleLimitChange}
                          className={styles.limitSelect}
                        >
                          <option value={10}>10</option>

                          <option value={20}>20</option>

                          <option value={50}>50</option>

                          <option value={100}>100</option>
                        </select>

                        <span>entries</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>#</th>

                          <th>Date</th>

                          <th>Particulars</th>

                          <th>Order / Ref.</th>

                          <th>Customer</th>

                          <th className={styles.amountColumn}>Debit (DR)</th>

                          <th className={styles.amountColumn}>Credit (CR)</th>

                          <th className={styles.amountColumn}>Balance</th>
                        </tr>
                      </thead>

                      <tbody>
                        {/* =====================================
                            OPENING BALANCE
                        ===================================== */}

                        {pagination.page === 1 && openingEntry && (
                          <tr className={styles.openingRow}>
                            <td>-</td>

                            <td>-</td>

                            <td>
                              <div className={styles.particular}>
                                <strong>{openingEntry.particulars}</strong>

                                <span>Opening balance for statement</span>
                              </div>
                            </td>

                            <td>-</td>

                            <td>-</td>

                            <td className={styles.amountCell}>-</td>

                            <td className={styles.amountCell}>-</td>

                            <td
                              className={`${styles.amountCell} ${styles.balanceAmount}`}
                            >
                              {money(openingEntry.balance)}
                            </td>
                          </tr>
                        )}

                        {/* =====================================
                            TRANSACTIONS
                        ===================================== */}

                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan="8" className={styles.noRecords}>
                              No cash transactions found.
                            </td>
                          </tr>
                        ) : (
                          transactions.map((item) => (
                            <tr
                              key={`${item.TransactionSource}-${item.SourceId}`}
                            >
                              <td>{item.RowNumber}</td>

                              <td className={styles.dateCell}>
                                {formatDate(item.TransactionDate)}
                              </td>

                              <td>
                                <div className={styles.particular}>
                                  <strong>{item.Particulars}</strong>

                                  <div>
                                    {item.TransactionType === "CR" ? (
                                      <span className={styles.creditBadge}>
                                        CR
                                      </span>
                                    ) : (
                                      <span className={styles.debitBadge}>
                                        DR
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td>
                                {item.TransactionSource === "ORDER_CASH" ? (
                                  <div className={styles.referenceInfo}>
                                    <strong>Order #{item.OrderID}</strong>

                                    {item.InvoiceNo && (
                                      <span>{item.InvoiceNo}</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className={styles.referenceInfo}>
                                    <strong>Handover #{item.SourceId}</strong>
                                  </div>
                                )}
                              </td>

                              <td>{item.CustomerName || "-"}</td>

                              <td
                                className={`${styles.amountCell} ${styles.debitAmount}`}
                              >
                                {Number(item.Debit || 0) > 0
                                  ? money(item.Debit)
                                  : "-"}
                              </td>

                              <td
                                className={`${styles.amountCell} ${styles.creditAmount}`}
                              >
                                {Number(item.Credit || 0) > 0
                                  ? money(item.Credit)
                                  : "-"}
                              </td>

                              <td
                                className={`${styles.amountCell} ${styles.balanceAmount}`}
                              >
                                {money(item.RunningBalance)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* =========================================
                      PAGINATION
                  ========================================= */}

                  {pagination.totalPages > 0 && (
                    <div className={styles.pagination}>
                      <div className={styles.paginationInfo}>
                        Page {pagination.page} of {pagination.totalPages}
                      </div>

                      <div className={styles.paginationButtons}>
                        <button
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page <= 1}
                        >
                          Previous
                        </button>

                        {Array.from(
                          {
                            length: Math.min(pagination.totalPages, 5),
                          },

                          (_, index) => {
                            const startPage = Math.max(1, page - 2);

                            const pageNumber = startPage + index;

                            if (pageNumber > pagination.totalPages) {
                              return null;
                            }

                            return (
                              <button
                                key={pageNumber}
                                onClick={() => handlePageChange(pageNumber)}
                                className={
                                  page === pageNumber ? styles.activePage : ""
                                }
                              >
                                {pageNumber}
                              </button>
                            );
                          },
                        )}

                        <button
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page >= pagination.totalPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryPassbook;
