import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { fetchCustomerLedger } from "../../features/reportSlice";

import {
  fetchCustomerName,
  fetchCustomerGroups,
} from "../../features/cutomerSlice";

import styles from "./CustomerReport.module.css";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const CustomerReport = () => {
  const dispatch = useDispatch();

  const { ledger, ledgerLoading, error } = useSelector((state) => state.report);

  const { customerName, customerGroups, groupLoading } = useSelector(
    (state) => state.customer,
  );

  // --------------------------------------------------
  // REPORT MODE
  // group | customer
  // --------------------------------------------------
  const [reportMode, setReportMode] = useState("group");

  // --------------------------------------------------
  // DATE
  // --------------------------------------------------
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // --------------------------------------------------
  // GROUP
  // --------------------------------------------------
  const [selectedGroupId, setSelectedGroupId] = useState("");

  // --------------------------------------------------
  // CUSTOMER
  // --------------------------------------------------
  const [customerSearch, setCustomerSearch] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------
  const [currentPage, setCurrentPage] = useState(1);

  const [rowsPerPage, setRowsPerPage] = useState(25);

  // --------------------------------------------------
  // INITIAL FETCH
  // --------------------------------------------------
  useEffect(() => {
    dispatch(fetchCustomerName());
    dispatch(fetchCustomerGroups());
  }, [dispatch]);

  // --------------------------------------------------
  // RESET SELECTION WHEN MODE CHANGES
  // --------------------------------------------------
  useEffect(() => {
    setSelectedGroupId("");

    setSelectedCustomer(null);
    setCustomerSearch("");

    setCurrentPage(1);
  }, [reportMode]);

  // --------------------------------------------------
  // RESET PAGE WHEN DATA CHANGES
  // --------------------------------------------------
  useEffect(() => {
    setCurrentPage(1);
  }, [ledger?.data]);

  // --------------------------------------------------
  // UNIQUE / FILTERED CUSTOMERS
  // --------------------------------------------------
  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customerName)) {
      return [];
    }

    const text = customerSearch.trim().toLowerCase();

    if (text.length < 2) {
      return [];
    }

    return customerName
      .filter((cust) => {
        const name = cust.CustomerName?.toLowerCase() || "";

        const area = cust.Area?.toLowerCase() || "";

        const address = cust.Address?.toLowerCase() || "";

        return (
          name.includes(text) || area.includes(text) || address.includes(text)
        );
      })
      .slice(0, 30);
  }, [customerSearch, customerName]);

  // --------------------------------------------------
  // REPORT DATA
  // --------------------------------------------------
  const ledgerData = ledger?.data || [];

  const summary = ledger?.summary || {
    totalSale: 0,
    totalPaymentReceived: 0,
    balance: 0,
  };

  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------
  const totalItems = ledgerData.length;

  const totalPages = Math.ceil(totalItems / rowsPerPage);

  const startIndex = (currentPage - 1) * rowsPerPage;

  const endIndex = startIndex + rowsPerPage;

  const paginatedData = ledgerData.slice(startIndex, endIndex);

  const startItem = totalItems === 0 ? 0 : startIndex + 1;

  const endItem = Math.min(endIndex, totalItems);

  // --------------------------------------------------
  // MODE CHANGE
  // --------------------------------------------------
  const handleModeChange = (mode) => {
    setReportMode(mode);
  };

  // --------------------------------------------------
  // SELECT CUSTOMER
  // --------------------------------------------------
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);

    setCustomerSearch(
      `${customer.CustomerName}${customer.Area ? ` - ${customer.Area}` : ""}`,
    );

    setShowCustomerDropdown(false);
  };

  // --------------------------------------------------
  // SEARCH / GENERATE LEDGER
  // --------------------------------------------------
  const handleSearch = () => {
    if (!from || !to) {
      alert("Please select From and To date");
      return;
    }

    if (from > to) {
      alert("From date cannot be greater than To date");
      return;
    }

    // GROUP
    if (reportMode === "group") {
      if (!selectedGroupId) {
        alert("Please select customer group");
        return;
      }

      dispatch(
        fetchCustomerLedger({
          from,
          to,
          customerGroupId: selectedGroupId,
        }),
      );

      return;
    }

    // CUSTOMER
    if (!selectedCustomer?.CustomerId) {
      alert("Please select customer");
      return;
    }

    dispatch(
      fetchCustomerLedger({
        from,
        to,
        customerId: selectedCustomer.CustomerId,
      }),
    );
  };

  // --------------------------------------------------
  // EXCEL DOWNLOAD
  // --------------------------------------------------
  const downloadExcel = () => {
    if (!ledgerData.length) {
      alert("No data to export");
      return;
    }

    const exportData = ledgerData.map((item) => ({
      "Sr.No": item.SrNo,

      Date: item.Date ? new Date(item.Date).toLocaleDateString("en-GB") : "",

      "Invoice No": item.InvoiceNo || "",

      Narration: item.Narration || "",

      "Sale Amount": Number(item.SaleAmount || 0),

      Area: item.Area || "",

      "Payment Received": Number(item.PaymentReceived || 0),
    }));

    // Add total row
    exportData.push({
      "Sr.No": "",
      Date: "",
      "Invoice No": "",
      Narration: "TOTAL",
      "Sale Amount": Number(summary.totalSale || 0),
      Area: "",
      "Payment Received": Number(summary.totalPaymentReceived || 0),
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 18 },
      { wch: 55 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Customer Ledger");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    const fileName = `${
      ledger?.reportName || "Customer"
    }_Ledger_${from}_to_${to}.xlsx`;

    saveAs(fileData, fileName);
  };

  const handlePrint = () => {
    if (!ledgerData.length) {
      alert("No data to print");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1500,height=950");

    if (!printWindow) {
      alert("Please allow popups to print the ledger");
      return;
    }

    const formatDate = (date) => {
      if (!date) return "-";

      return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const formatAmount = (amount) => {
      const value = Number(amount || 0);

      return value > 0
        ? `₹${value.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : "-";
    };

    const escapeHtml = (value) => {
      if (value === null || value === undefined) return "";

      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    // ==================================================
    // LEDGER ROWS
    // ==================================================
    const rows = ledgerData
      .map(
        (item) => `
        <tr>
          <td class="srno">
            ${escapeHtml(item.SrNo)}
          </td>

          <td class="date">
            ${escapeHtml(formatDate(item.Date))}
          </td>

          <td class="invoice">
            ${escapeHtml(item.InvoiceNo || "-")}
          </td>

          <td class="customer">
            ${escapeHtml(item.CustomerName || "-")}
          </td>

          <td class="narration">
            ${escapeHtml(item.Narration || "-")}
          </td>

          <td class="area">
            ${escapeHtml(item.Area || "-")}
          </td>

          <td class="amount payment">
            ${escapeHtml(formatAmount(item.PaymentReceived))}
          </td>

          <td class="amount sale">
            ${escapeHtml(formatAmount(item.SaleAmount))}
          </td>
        </tr>
      `,
      )
      .join("");

    printWindow.document.write(`
    <!DOCTYPE html>

    <html>
      <head>
        <title>
          ${escapeHtml(ledger?.reportName || "Customer")} - Customer Ledger
        </title>

        <meta charset="UTF-8" />

        <style>
          /* ===========================================
             PAGE
          =========================================== */

          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
          }

          body {
            font-family:
              Arial,
              Helvetica,
              sans-serif;

            color: #111827;

            background: #ffffff;

            font-size: 9px;

            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .page {
            width: 100%;
          }

          /* ===========================================
             REPORT HEADER
          =========================================== */

          .reportHeader {
            width: 100%;

            border-bottom: 2px solid #111827;

            padding-bottom: 8px;

            margin-bottom: 10px;
          }

          .title {
            margin: 0;

            text-align: center;

            font-size: 19px;

            font-weight: 700;

            letter-spacing: 0.7px;

            color: #111827;
          }

          .ledgerName {
            text-align: center;

            margin-top: 4px;

            font-size: 14px;

            font-weight: 700;

            color: #1f2937;
          }

          .reportMeta {
            margin-top: 9px;

            display: flex;

            justify-content: center;

            align-items: center;

            gap: 28px;

            flex-wrap: wrap;

            font-size: 9px;

            color: #4b5563;
          }

          .reportMeta strong {
            color: #111827;
          }

          /* ===========================================
             SUMMARY
          =========================================== */

          .summaryRow {
            width: 100%;

            display: flex;

            justify-content: flex-end;

            gap: 8px;

            margin-bottom: 10px;
          }

          .summaryCard {
            min-width: 150px;

            border: 1px solid #9ca3af;

            border-radius: 4px;

            padding: 6px 9px;

            background: #f9fafb;
          }

          .summaryLabel {
            display: block;

            font-size: 8px;

            text-transform: uppercase;

            color: #6b7280;

            margin-bottom: 3px;

            font-weight: 600;
          }

          .summaryValue {
            display: block;

            font-size: 11px;

            font-weight: 700;

            color: #111827;
          }

          /* ===========================================
             TABLE
          =========================================== */

          table {
            width: 100%;

            border-collapse: collapse;

            table-layout: fixed;

            border: 1px solid #374151;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-row-group;
          }

          tr {
            page-break-inside: avoid;
          }

          th {
            border: 1px solid #374151;

            background: #e5e7eb;

            color: #111827;

            font-size: 8.5px;

            font-weight: 700;

            padding: 6px 4px;

            text-align: left;

            vertical-align: middle;

            line-height: 1.2;
          }

          td {
            border: 1px solid #9ca3af;

            padding: 5px 4px;

            vertical-align: top;

            font-size: 8.5px;

            line-height: 1.3;

            overflow-wrap: anywhere;

            word-break: break-word;

            background: #ffffff;
          }

          tbody tr:nth-child(even) td {
            background: #f9fafb;
          }

          /* ===========================================
             EXACT COLUMN WIDTHS
          =========================================== */

          th:nth-child(1),
          td:nth-child(1) {
            width: 4%;
          }

          th:nth-child(2),
          td:nth-child(2) {
            width: 8%;
          }

          th:nth-child(3),
          td:nth-child(3) {
            width: 10%;
          }

          th:nth-child(4),
          td:nth-child(4) {
            width: 14%;
          }

          th:nth-child(5),
          td:nth-child(5) {
            width: 32%;
          }

          th:nth-child(6),
          td:nth-child(6) {
            width: 10%;
          }

          th:nth-child(7),
          td:nth-child(7) {
            width: 11%;
          }

          th:nth-child(8),
          td:nth-child(8) {
            width: 11%;
          }

          /* ===========================================
             CELLS
          =========================================== */

          .srno {
            text-align: center;

            vertical-align: middle;
          }

          .date {
            white-space: nowrap;

            text-align: center;
          }

          .invoice {
            font-weight: 600;

            white-space: nowrap;
          }

          .customer {
            font-weight: 600;

            color: #111827;
          }

          .narration {
            white-space: normal;

            line-height: 1.35;

            color: #374151;
          }

          .area {
            font-weight: 500;
          }

          .amount {
            text-align: right;

            white-space: nowrap;

            font-weight: 600;
          }

          .payment {
            color: #166534;
          }

          .sale {
            color: #111827;
          }

          /* ===========================================
             GRAND TOTAL
          =========================================== */

          .totalRow td {
            background: #e5e7eb !important;

            border-top: 2px solid #111827;

            font-weight: 700;

            padding-top: 7px;

            padding-bottom: 7px;
          }

          .totalLabel {
            text-align: right;

            font-size: 9px;

            letter-spacing: 0.3px;
          }

          /* ===========================================
             FOOTER
          =========================================== */

          .printFooter {
            margin-top: 8px;

            display: flex;

            justify-content: space-between;

            align-items: center;

            font-size: 7.5px;

            color: #6b7280;
          }

          /* ===========================================
             PRINT
          =========================================== */

          @media print {
            body {
              margin: 0;

              -webkit-print-color-adjust: exact;

              print-color-adjust: exact;
            }

            .page {
              page-break-after: auto;
            }

            thead {
              display: table-header-group;
            }

            tr {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>

      <body>

        <div class="page">

          <!-- ===============================
               HEADER
          ================================ -->

          <div class="reportHeader">

            <h1 class="title">
              CUSTOMER LEDGER
            </h1>

            <div class="ledgerName">
              ${escapeHtml(ledger?.reportName || "Customer")}
            </div>

            <div class="reportMeta">

              <div>
                <strong>Ledger Type:</strong>

                ${
                  ledger?.reportType === "GROUP"
                    ? "Group Wise"
                    : "Customer Wise"
                }
              </div>

              <div>
                <strong>From:</strong>

                ${escapeHtml(formatDate(from))}
              </div>

              <div>
                <strong>To:</strong>

                ${escapeHtml(formatDate(to))}
              </div>

              <div>
                <strong>Total Entries:</strong>

                ${ledgerData.length}
              </div>

            </div>

          </div>


          <!-- ===============================
               SUMMARY
          ================================ -->

          <div class="summaryRow">

            <div class="summaryCard">

              <span class="summaryLabel">
                Total Sale
              </span>

              <span class="summaryValue">
                ₹${Number(summary.totalSale || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>

            </div>


            <div class="summaryCard">

              <span class="summaryLabel">
                Payment Received
              </span>

              <span class="summaryValue">
                ₹${Number(summary.totalPaymentReceived || 0).toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}
              </span>

            </div>


            <div class="summaryCard">

              <span class="summaryLabel">
                Balance
              </span>

              <span class="summaryValue">
                ₹${Number(summary.balance || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>

            </div>

          </div>


          <!-- ===============================
               LEDGER TABLE
          ================================ -->

          <table>

            <thead>

              <tr>

                <th>
                  Sr.No
                </th>

                <th>
                  Date
                </th>

                <th>
                  Invoice No
                </th>

                <th>
                  Customer Name
                </th>

                <th>
                  Narration
                </th>

                <th>
                  Area
                </th>

                <th>
                  Payment Received
                </th>

                <th>
                  Sale Amount
                </th>

              </tr>

            </thead>


            <tbody>

              ${rows}

            </tbody>


            <tfoot>

              <tr class="totalRow">

                <td
                  colspan="6"
                  class="totalLabel"
                >
                  GRAND TOTAL
                </td>

                <td class="amount payment">

                  ₹${Number(summary.totalPaymentReceived || 0).toLocaleString(
                    "en-IN",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}

                </td>

                <td class="amount sale">

                  ₹${Number(summary.totalSale || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}

                </td>

              </tr>

            </tfoot>

          </table>


          <!-- ===============================
               FOOTER
          ================================ -->

          <div class="printFooter">

            <div>
              ${
                ledger?.reportType === "GROUP"
                  ? `Group: ${escapeHtml(ledger?.reportName || "-")}`
                  : `Customer: ${escapeHtml(ledger?.reportName || "-")}`
              }
            </div>

            <div>
              Printed on:
              ${new Date().toLocaleString("en-IN")}
            </div>

          </div>

        </div>


        <script>
          window.onload = function () {
            window.focus();

            setTimeout(function () {
              window.print();
            }, 350);
          };
        </script>

      </body>

    </html>
  `);

    printWindow.document.close();
  };

  // --------------------------------------------------
  // PAGE NUMBERS
  // --------------------------------------------------
  const getPageNumbers = () => {
    if (totalPages <= 1) {
      return [1];
    }

    const pages = [];
    const delta = 2;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      }
    }

    const result = [];
    let previous;

    pages.forEach((page) => {
      if (previous && page - previous > 1) {
        result.push("...");
      }

      result.push(page);
      previous = page;
    });

    return result;
  };

  return (
    <div className={styles.container}>
      <div className={styles.reportCard}>
        {/* ========================================
            HEADER
        ======================================== */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Customer Ledger</h2>

            <p className={styles.subtitle}>
              Group wise and customer wise sales & payment ledger
            </p>
          </div>

          {ledgerData.length > 0 && (
            <div className={styles.headerActions}>
              <button
                type="button"
                onClick={handlePrint}
                className={styles.printBtn}
              >
                🖨 Print Ledger
              </button>

              <button
                type="button"
                onClick={downloadExcel}
                className={styles.excelBtn}
              >
                ⬇ Download Excel
              </button>
            </div>
          )}
        </div>

        {/* ========================================
            MODE SELECTOR
        ======================================== */}
        <div className={styles.modeSelector}>
          <button
            type="button"
            onClick={() => handleModeChange("group")}
            className={`${styles.modeBtn} ${
              reportMode === "group" ? styles.activeMode : ""
            }`}
          >
            Group Wise
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("customer")}
            className={`${styles.modeBtn} ${
              reportMode === "customer" ? styles.activeMode : ""
            }`}
          >
            Customer Wise
          </button>
        </div>

        {/* ========================================
            FILTERS
        ======================================== */}
        <div className={styles.filters}>
          {/* FROM */}
          <div className={styles.inputBox}>
            <label>From Date</label>

            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={styles.dateInput}
            />
          </div>

          {/* TO */}
          <div className={styles.inputBox}>
            <label>To Date</label>

            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className={styles.dateInput}
            />
          </div>

          {/* ====================================
              GROUP MODE
          ==================================== */}
          {reportMode === "group" && (
            <div className={styles.inputBox}>
              <label>Customer Group</label>

              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className={styles.selectInput}
              >
                <option value="">Select Group</option>

                {customerGroups?.map((group) => (
                  <option
                    key={group.CustomerGroupID}
                    value={group.CustomerGroupID}
                  >
                    {group.GroupName}
                  </option>
                ))}
              </select>

              {groupLoading && <small>Loading groups...</small>}
            </div>
          )}

          {/* ====================================
              CUSTOMER MODE
          ==================================== */}
          {reportMode === "customer" && (
            <div className={styles.customerSearchBox}>
              <label>Customer</label>

              <input
                type="text"
                value={customerSearch}
                placeholder="Search customer, area or address..."
                onChange={(e) => {
                  setCustomerSearch(e.target.value);

                  setSelectedCustomer(null);

                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className={styles.selectInput}
                autoComplete="off"
              />

              {showCustomerDropdown && customerSearch.length >= 2 && (
                <div className={styles.customerDropdown}>
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((cust) => (
                      <button
                        type="button"
                        key={cust.CustomerId}
                        className={styles.customerOption}
                        onClick={() => handleCustomerSelect(cust)}
                      >
                        <div className={styles.customerOptionName}>
                          {cust.CustomerName}
                        </div>

                        <div className={styles.customerOptionDetails}>
                          {cust.Area || "No Area"}

                          {cust.Address ? ` • ${cust.Address}` : ""}
                        </div>

                        {cust.CustomerGroupID && (
                          <span className={styles.groupBadge}>
                            Group Customer
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className={styles.noCustomer}>No customer found</div>
                  )}
                </div>
              )}

              {selectedCustomer && (
                <div className={styles.selectedCustomer}>
                  Selected:
                  <strong>{selectedCustomer.CustomerName}</strong>
                  {selectedCustomer.Area && ` - ${selectedCustomer.Area}`}
                </div>
              )}
            </div>
          )}

          {/* GENERATE */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={ledgerLoading}
            className={styles.searchBtn}
          >
            {ledgerLoading ? "Generating..." : "Generate Ledger"}
          </button>
        </div>

        {/* ========================================
            APPLIED REPORT NAME
        ======================================== */}
        {ledger?.reportName && (
          <div className={styles.reportInfo}>
            <div>
              <span>Ledger:</span>

              <strong>{ledger.reportName}</strong>
            </div>

            <div>
              <span>Type:</span>

              <strong>
                {ledger.reportType === "GROUP" ? "Group Wise" : "Customer Wise"}
              </strong>
            </div>

            <div>
              <span>Period:</span>

              <strong>
                {from} to {to}
              </strong>
            </div>
          </div>
        )}

        {/* ========================================
            SUMMARY
        ======================================== */}
        {ledgerData.length > 0 && (
          <div className={styles.summaryBar}>
            <div className={styles.summaryItem}>
              <span>Total Sale</span>

              <h3>₹{Number(summary.totalSale || 0).toLocaleString("en-IN")}</h3>
            </div>

            <div className={styles.summaryItem}>
              <span>Payment Received</span>

              <h3 className={styles.greenText}>
                ₹
                {Number(summary.totalPaymentReceived || 0).toLocaleString(
                  "en-IN",
                )}
              </h3>
            </div>

            <div className={styles.summaryItem}>
              <span>Balance</span>

              <h3
                className={
                  Number(summary.balance || 0) > 0
                    ? styles.redText
                    : styles.greenText
                }
              >
                ₹{Number(summary.balance || 0).toLocaleString("en-IN")}
              </h3>
            </div>
          </div>
        )}

        {/* ========================================
            LOADER
        ======================================== */}
        {ledgerLoading && (
          <div className={styles.loader}>
            <div className={styles.spinner} />

            <span>Loading Customer Ledger...</span>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className={styles.errorBox}>
            ⚠️{" "}
            {typeof error === "string"
              ? error
              : error?.message || "Something went wrong"}
          </div>
        )}

        {/* ========================================
            LEDGER TABLE
        ======================================== */}
        {!ledgerLoading && ledgerData.length > 0 && (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.ledgerTable}>
                <thead>
                  <tr>
                    <th>Sr.No</th>

                    <th>Date</th>

                    <th>Invoice No</th>

                    <th>Customer Name</th>

                    <th>Narration</th>

                    <th>Area</th>

                    <th>Payment Received</th>

                    <th>Sale Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedData.map((item, index) => (
                    <tr key={`${item.SrNo}-${index}`}>
                      <td className={styles.centerCell}>{item.SrNo}</td>

                      <td className={styles.dateCell}>
                        {item.Date
                          ? new Date(item.Date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>

                      <td className={styles.invoiceCell}>
                        {item.InvoiceNo || "-"}
                      </td>

                      <td className={styles.customerNameCell}>
                        {item.CustomerName || "-"}
                      </td>

                      <td className={styles.narrationCell}>{item.Narration}</td>

                      <td>
                        <span className={styles.areaBadge}>
                          {item.Area || "-"}
                        </span>
                      </td>

                      <td className={styles.paymentAmount}>
                        {Number(item.PaymentReceived || 0) > 0
                          ? `₹${Number(item.PaymentReceived).toLocaleString(
                              "en-IN",
                            )}`
                          : "-"}
                      </td>

                      <td className={styles.saleAmount}>
                        {Number(item.SaleAmount || 0) > 0
                          ? `₹${Number(item.SaleAmount).toLocaleString(
                              "en-IN",
                            )}`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr>
                    <td colSpan="4" className={styles.totalLabel}>
                      GRAND TOTAL
                    </td>

                    <td className={styles.saleAmount}>
                      ₹{Number(summary.totalSale || 0).toLocaleString("en-IN")}
                    </td>

                    <td />

                    <td className={styles.paymentAmount}>
                      ₹
                      {Number(summary.totalPaymentReceived || 0).toLocaleString(
                        "en-IN",
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ====================================
                  PAGINATION
              ==================================== */}
            <div className={styles.paginationContainer}>
              <div className={styles.rowsPerPage}>
                <span>Show</span>

                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));

                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>

                  <option value={25}>25</option>

                  <option value={50}>50</option>

                  <option value={100}>100</option>
                </select>

                <span>entries</span>
              </div>

              <div className={styles.paginationInfo}>
                Showing {startItem} to {endItem} of {totalItems}
              </div>

              <div className={styles.pagination}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  ← Prev
                </button>

                {getPageNumbers().map((page, index) => (
                  <button
                    key={index}
                    disabled={page === "..."}
                    onClick={() => {
                      if (typeof page === "number") {
                        setCurrentPage(page);
                      }
                    }}
                    className={currentPage === page ? styles.activePage : ""}
                  >
                    {page}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}

        {/* ========================================
            NO DATA
        ======================================== */}
        {!ledgerLoading && ledgerData.length === 0 && (
          <div className={styles.noData}>
            <div className={styles.noDataIcon}>📒</div>

            <h3>Customer Ledger</h3>

            <p>
              Select Group Wise or Customer Wise, choose dates and generate the
              ledger.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerReport;
