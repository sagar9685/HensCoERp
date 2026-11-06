import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaFileInvoice,
  FaSyncAlt,
} from "react-icons/fa";

import { fetchCustomerOutstandingDetails } from "../../features/reportSlice";
import styles from "./CustomerOutstandingModal.module.css";

import axios from "axios";
import * as XLSX from "xlsx";
import { FaFileExcel } from "react-icons/fa";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const reportTypes = {
  sales: {
    title: "Total Sales",
    column: "Total Sales",
  },
  received: {
    title: "Payment Received",
    column: "Received Amount",
  },
  outstanding: {
    title: "Outstanding Orders",
    column: "Outstanding",
  },
  pending: {
    title: "Pending Verification",
    column: "Pending Amount",
  },
  verified: {
    title: "Verified Payments",
    column: "Verified Amount",
  },
};

const CustomerOutstandingModal = ({
  open,
  onClose,
  type,
  filters = {},
  customer = null,
}) => {
  const dispatch = useDispatch();

  const {
    orders = [],
    totalRecords = 0,
    grandTotal = 0,
    loading = false,
    error = null,
  } = useSelector((state) => state.report.customerOutstandingDetails);

  const [page, setPage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const [exportLoading, setExportLoading] = useState(false);

  const pageSize = 15;
  const config = reportTypes[type] || reportTypes.sales;

  const customerName = customer?.CustomerName || filters.customerName || "";

  const contactNo = customer?.ContactNo || "";

  const area = filters.area || "";

  const from = filters.from || "";
  const to = filters.to || "";

  useEffect(() => {
    if (!open || !type) return;

    const promise = dispatch(
      fetchCustomerOutstandingDetails({
        type,
        customerName,
        ...(contactNo ? { contactNo } : {}),
        area,
        from,
        to,
        page,
        limit: pageSize,
      }),
    );

    return () => {
      promise.abort();
    };
  }, [
    dispatch,
    open,
    type,
    customerName,
    contactNo,
    area,
    from,
    to,
    page,
    retryKey,
  ]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalRecords);

  const handlePrevious = () => {
    if (page <= 1 || loading) return;
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    if (page >= totalPages || loading) return;
    setPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleRetry = () => {
    setRetryKey((prev) => prev + 1);
  };

  const handleExportExcel = async () => {
    if (exportLoading || loading) return;

    setExportLoading(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const exportPageSize = 100;

      const params = {
        type,
        customerName,
        ...(contactNo ? { contactNo } : {}),
        area,
        from,
        to,
        limit: exportPageSize,
      };

      let allOrders = [];
      let currentPage = 1;
      let total = 0;

      // Fetch all matching records, not just current page
      do {
        const response = await axios.get(
          `${API_BASE_URL}/api/reports/customer-outstanding/details`,
          {
            params: {
              ...params,
              page: currentPage,
            },
          },
        );

        const result = response.data;

        if (!result.success) {
          throw new Error("Failed to fetch report");
        }

        const pageOrders = result.orders || [];

        allOrders.push(...pageOrders);
        total = Number(result.totalRecords || 0);

        if (pageOrders.length === 0 && allOrders.length < total) {
          throw new Error("Incomplete report data");
        }

        currentPage++;
      } while (allOrders.length < total);

      if (!allOrders.length) {
        alert("No records available to export.");
        return;
      }

      const reportTitle = config.title;

      const headers = [
        "Sr No",
        "Invoice No",
        "Order ID",
        "Order Date",
        "Customer Name",
        "Contact Number",
        "Area",
        "Delivery Man",
        "Delivery Status",

        "Actual Delivery Date",
        "Payment Received Date",
        "Total Sales",
        "Payment Received",
        "Verified Amount",
        "Pending Verification",
        "Other Verification",
        "Outstanding",
        config.column,
      ];

      const money = (value) => Number(value) || 0;

      const excelRows = allOrders.map((order, index) => [
        index + 1,
        order.InvoiceNo || "",
        order.OrderID,
        formatDate(order.OrderDate),
        order.CustomerName || "",
        String(order.ContactNo || ""),
        order.Area || "",
        order.DeliveryManName || "Not Assigned",
        order.DeliveryStatus || "Not Assigned",

        formatDate(order.ActualDeliveryDate),
        formatDate(order.LastPaymentDate || order.PaymentReceivedDate),
        money(order.TotalSales),
        money(order.TotalReceived),
        money(order.VerifiedAmount),
        money(order.PendingVerification),
        money(order.OtherVerification),
        money(order.Outstanding),
        money(order.SelectedAmount),
      ]);

      const amountKeys = [
        "TotalSales",
        "TotalReceived",
        "VerifiedAmount",
        "PendingVerification",
        "OtherVerification",
        "Outstanding",
        "SelectedAmount",
      ];

      const totals = Object.fromEntries(
        amountKeys.map((key) => [
          key,
          allOrders.reduce((sum, order) => sum + money(order[key]), 0),
        ]),
      );

      const totalRow = [
        "",
        "GRAND TOTAL",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        totals.TotalSales,
        totals.TotalReceived,
        totals.VerifiedAmount,
        totals.PendingVerification,
        totals.OtherVerification,
        totals.Outstanding,
        totals.SelectedAmount,
      ];

      // Workbook heading and summary
      const sheetData = [
        [reportTitle.toUpperCase()],
        [
          "Customer",
          customerName || "All Customers",
          "Area",
          area || "All Areas",
        ],
        ["From Date", from || "All Dates", "To Date", to || "All Dates"],
        ["Total Records", allOrders.length],
        [],
        headers,
        ...excelRows,
        totalRow,
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      worksheet["!merges"] = [
        {
          s: { r: 0, c: 0 },
          e: { r: 0, c: headers.length - 1 },
        },
      ];

      worksheet["!cols"] = [
        { wch: 8 },
        { wch: 19 },
        { wch: 12 },
        { wch: 17 },
        { wch: 35 },
        { wch: 18 },
        { wch: 22 },
        { wch: 25 },
        { wch: 18 },
        { wch: 19 },
        { wch: 19 },
        { wch: 20 },
        ...Array.from({ length: 7 }, () => ({ wch: 20 })),
      ];

      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: 5, c: 0 },
          e: { r: 5 + excelRows.length, c: headers.length - 1 },
        }),
      };

      // INR formatting for amount columns
      const firstDataRow = 6;
      const lastDataRow = firstDataRow + excelRows.length;

      for (let row = firstDataRow; row <= lastDataRow; row++) {
        for (let col = 12; col <= 18; col++) {
          const address = XLSX.utils.encode_cell({
            r: row,
            c: col,
          });

          if (worksheet[address]) {
            worksheet[address].z = '"₹"#,##0.00;[Red]("₹"#,##0.00)';
          }
        }
      }

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Order Details");

      const dateString = new Date().toLocaleDateString("en-CA");

      const safeName = (customerName || "All_Customers")
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 50);

      const fileName = `Customer_${type}_${safeName}_${dateString}.xlsx`;

      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error("Excel Export Error:", error);

      alert(
        error.response?.data?.message ||
          error.message ||
          "Failed to export Excel report",
      );
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="outstandingModalTitle"
      >
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <div className={styles.titleIcon}>
              <FaFileInvoice />
            </div>

            <div>
              <h2 id="outstandingModalTitle">{config.title}</h2>

              <p>
                {customer
                  ? `${customer.CustomerName} | ${customer.ContactNo || "-"}`
                  : "Order-wise payment and invoice details"}
              </p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.excelBtn}
              onClick={handleExportExcel}
              disabled={loading || exportLoading || totalRecords === 0}
            >
              {exportLoading ? (
                <FaSyncAlt className={styles.spin} />
              ) : (
                <FaFileExcel />
              )}

              {exportLoading ? "Exporting..." : "Export Excel"}
            </button>

            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close modal"
            >
              <FaTimes />
            </button>
          </div>
        </header>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span>Total Orders</span>
            <strong>{totalRecords}</strong>
          </div>

          <div className={styles.stat}>
            <span>{config.title} Amount</span>
            <strong className={styles.totalAmount}>
              {formatCurrency(grandTotal)}
            </strong>
          </div>

          <div className={styles.stat}>
            <span>Applied Date Range</span>
            <strong>
              {from && to
                ? `${formatDate(from)} - ${formatDate(to)}`
                : "All Dates"}
            </strong>
          </div>
        </div>

        <div className={styles.body}>
          {loading ? (
            <div className={styles.centerState}>
              <FaSyncAlt className={styles.spin} />
              <p>Loading order details...</p>
            </div>
          ) : error ? (
            <div className={styles.centerState}>
              <p className={styles.error}>
                {typeof error === "string"
                  ? error
                  : error.message || "Unable to load details"}
              </p>

              <button type="button" onClick={handleRetry}>
                <FaSyncAlt />
                Retry
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className={styles.centerState}>
              <FaFileInvoice size={32} />
              <h3>No Orders Found</h3>
              <p>No records matched the selected filters.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Sr.</th>
                    <th>Order / Invoice</th>
                    <th>Order Date</th>
                    <th>Customer Details</th>
                    <th>Area</th>
                    <th>Delivery Man</th>
                    <th>Delivery Status</th>
                    <th>Delivery Date</th>
                    <th>Payment Date</th>
                    <th>Total Sales</th>
                    <th>Received</th>
                    <th>Verified</th>
                    <th>Pending Verification</th>
                    <th>Outstanding</th>
                    <th>{config.column}</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order, index) => (
                    <tr key={order.OrderID}>
                      <td>{(page - 1) * pageSize + index + 1}</td>

                      <td>
                        <div className={styles.primaryCell}>
                          <strong>
                            {order.InvoiceNo || `#${order.OrderID}`}
                          </strong>

                          <small>Order ID: {order.OrderID}</small>
                        </div>
                      </td>

                      <td>{formatDate(order.OrderDate)}</td>

                      <td>
                        <div className={styles.primaryCell}>
                          <strong>{order.CustomerName || "-"}</strong>

                          <small>{order.ContactNo || "-"}</small>
                        </div>
                      </td>

                      <td>{order.Area || "-"}</td>

                      <td>{order.DeliveryManName || "Not Assigned"}</td>

                      <td>
                        <span className={styles.status}>
                          {order.DeliveryStatus || "Not Assigned"}
                        </span>
                      </td>

                      <td>{formatDate(order.ActualDeliveryDate)}</td>

                      <td>{formatDate(order.PaymentReceivedDate)}</td>

                      <td>{formatCurrency(order.TotalSales)}</td>

                      <td className={styles.received}>
                        {formatCurrency(order.TotalReceived)}
                      </td>

                      <td className={styles.verified}>
                        {formatCurrency(order.VerifiedAmount)}
                      </td>

                      <td className={styles.pending}>
                        {formatCurrency(order.PendingVerification)}
                      </td>

                      <td className={styles.outstanding}>
                        {formatCurrency(order.Outstanding)}
                      </td>

                      <td className={styles.selected}>
                        {formatCurrency(order.SelectedAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          <div className={styles.recordInfo}>
            {totalRecords > 0
              ? `Showing ${startIndex}-${endIndex} of ${totalRecords} orders`
              : "0 records"}
          </div>

          <div className={styles.pagination}>
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={handlePrevious}
            >
              <FaChevronLeft />
              Previous
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={handleNext}
            >
              Next
              <FaChevronRight />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CustomerOutstandingModal;
