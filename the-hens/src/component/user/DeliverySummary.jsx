import { useDispatch, useSelector } from "react-redux";
import { useState, useEffect, useRef } from "react";
import {
  fetchDeliverySummary,
  resetDeliveryAnalysis,
} from "../../features/deliveryBoyAnalysisSlice";
import { fetchDeliveryMen } from "../../features/assignedOrderSlice";
import styles from "./DeliverySummary.module.css";
import UserSideBar from "./UserSidebar";
import UserNavbar from "./UserNavBar";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // Add this import
import * as XLSX from "xlsx-js-style";

const DeliverySummary = () => {
  const dispatch = useDispatch();
  const { orders, summary, totalOrders, loading, error } = useSelector(
    (state) => state.deliveryBoyAnalysis,
  );

  console.log(orders, "DeliverySummary");

  const [fromDeliveryDate, setFromDeliveryDate] = useState("");
  const [toDeliveryDate, setToDeliveryDate] = useState("");
  const [deliveryManId, setDeliveryManId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const { deliveryMen } = useSelector((state) => state.assignedOrders);
  const tableRef = useRef(null);

  useEffect(() => {
    dispatch(fetchDeliveryMen());
  }, [dispatch]);

  // Reset to page 1 when orders change
  useEffect(() => {
    setCurrentPage(1);
  }, [orders]);

  const handleSearch = () => {
    dispatch(
      fetchDeliverySummary({
        fromDeliveryDate,
        toDeliveryDate,
        deliveryManId: deliveryManId || null,
      }),
    );
  };

  const handleReset = () => {
    setFromDeliveryDate("");
    setToDeliveryDate("");
    setDeliveryManId("");
    setCurrentPage(1);
    dispatch(resetDeliveryAnalysis());
  };

  // Calculate pagination
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = orders.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(orders.length / rowsPerPage);

  // Pagination handlers
  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let end = Math.min(totalPages, start + maxVisiblePages - 1);

      if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }

      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }
    }

    return pageNumbers;
  };

  const exportToPDF = () => {
    const doc = new jsPDF("landscape", "mm", "a4");

    // Header Background
    doc.setFillColor(63, 102, 241);
    doc.rect(0, 0, 297, 20, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("DELIVERY SUMMARY REPORT", 148, 13, { align: "center" });

    // Summary Row in PDF
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(
      `Total Sales: Rs. ${summary.totalSales} | Generated on: ${new Date().toLocaleDateString()}`,
      14,
      28,
    );

    const tableColumn = [
      "#",
      "Customer",
      "Address",
      "Area",
      "Delivery Boy",
      "Date",
      "Items",
      "Qty",
      "Items Total",
      "Charges",
      "Total",
      "Payment Info",
    ];

    const tableRows = orders.map((o, i) => [
      i + 1,
      o.CustomerName,
      o.Address.substring(0, 20) + "...",
      o.Area,
      o.DeliveryBoyName,
      formatDate(o.DeliveryDate?.slice(0, 10)),
      o.Items.substring(0, 15),
      o.TotalQty,
      o.ItemsTotal,
      o.DeliveryCharge,
      o.OrderTotal,
      `C:${o.Cash} G:${o.GPay} B:${o.BankTransfer}`,
    ]);

    autoTable(doc, {
      startY: 35,
      head: [tableColumn],
      body: tableRows,
      theme: "striped",
      styles: { fontSize: 6.5, cellPadding: 2 },
      headStyles: { fillColor: [63, 102, 241] },
      margin: { left: 5, right: 5 },
    });

    doc.save(`Delivery_Summary_${new Date().getTime()}.pdf`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-GB", { month: "short" }); // Jan, Feb, etc.
    const year = String(date.getFullYear()).slice(-2); // 26

    return `${day}-${month}-${year}`;
  };

  const exportToExcel = () => {
    if (!orders.length) {
      alert("No data to export!");
      return;
    }

    try {
      const excelData = [];

      orders.forEach((o, i) => {
        const itemList = o.Items ? o.Items.split(",") : [];
        const weightList = o.Weights ? o.Weights.split(",") : [];
        const qtyList = o.ItemQuantities ? o.ItemQuantities.split(",") : [];
        const rateList = o.Rates ? o.Rates.split(",") : [];

        const rowCount = Math.max(
          itemList.length,
          weightList.length,
          qtyList.length,
          rateList.length,
          1,
        );

        for (let j = 0; j < rowCount; j++) {
          const rawQty = qtyList[j]?.trim() || "";
          const cleanQty = rawQty.replace(/[^0-9.]/g, "");

          excelData.push({
            "S.No": j === 0 ? i + 1 : "",
            "Customer Name": o.CustomerName,
            Address: o.Address,
            Area: o.Area,
            "Contact No": o.ContactNo,
            "Delivery Boy": o.DeliveryBoyName,
            "Delivery Date": formatDate(o.DeliveryDate?.slice(0, 10)) || "",
            Status: j === 0 ? o.DeliveryStatus : "", // ✅ Added
            "Items Detail": itemList[j]?.trim() || "",
            Weight: weightList[j]?.trim() || "",
            "Item Qty": cleanQty,
            "Total Qty": j === 0 ? o.TotalQty || 0 : "",
            Rate: rateList[j]?.trim() || "",
            "Delivery Charge": j === 0 ? o.DeliveryCharge || 0 : "",
            "Items Total": j === 0 ? o.ItemsTotal || 0 : "",
            "Payment Date":
              j === 0
                ? formatDate(o.PaymentReceivedDate?.slice(0, 10)) || ""
                : "",
            "Cash (₹)": j === 0 ? o.Cash || 0 : "",
            "GPay (₹)": j === 0 ? o.GPay || 0 : "",
            "Bank Transfer (₹)": j === 0 ? o.BankTransfer || 0 : "",
            "Paytm (₹)": j === 0 ? o.Paytm || 0 : "",
            "FOC (₹)": j === 0 ? o.FOC || 0 : "",
            "Grand Total (₹)": j === 0 ? o.OrderTotal || 0 : "",
          });
        }
      });

      const summaryRow = {
        "Customer Name": "GRAND TOTAL",
        "Cash (₹)": summary.cash || 0,
        "GPay (₹)": summary.gpay || 0,
        "Bank Transfer (₹)": summary.bank || 0,
        "Paytm (₹)": summary.paytm || 0,
        "FOC (₹)": summary.foc || 0,
        "Grand Total (₹)": summary.totalSales || 0,
      };

      const finalData = [...excelData, {}, summaryRow];
      const ws = XLSX.utils.json_to_sheet(finalData);

      // ✅ Apply Red Style For Cancel Rows
      const range = XLSX.utils.decode_range(ws["!ref"]);

      // Status column index = 7 (0 based)
      const statusColumnIndex = 7;

      for (let R = 1; R <= range.e.r; ++R) {
        const statusCellAddress = XLSX.utils.encode_cell({
          r: R,
          c: statusColumnIndex,
        });

        const statusCell = ws[statusCellAddress];

        if (
          statusCell &&
          statusCell.v &&
          statusCell.v.toString().toLowerCase().includes("cancel")
        ) {
          for (let C = 0; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });

            if (!ws[cellAddress]) continue;

            ws[cellAddress].s = {
              fill: { fgColor: { rgb: "FFCCCC" } },
              font: { color: { rgb: "FF0000" }, bold: true },
            };
          }
        }
      }

      // Column widths
      ws["!cols"] = [
        { wch: 6 },
        { wch: 25 },
        { wch: 30 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 15 },
        { wch: 12 }, // Status
        { wch: 20 },
        { wch: 15 },
        { wch: 10 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Delivery_Report");

      const fileName = `Delivery_Report_${
        fromDeliveryDate || "All"
      }_to_${toDeliveryDate || "Today"}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Excel Export Error:", error);
      alert("Excel file generate karne mein error aaya.");
    }
  };

  return (
    <>
      <div className="container-scroller">
        <UserSideBar />
        <div className="container-fluid page-body-wrapper">
          <UserNavbar />
          <div className={styles.container}>
            <h2 className={styles.heading}>Delivery Summary</h2>

            {/* Filters */}
            <div className={styles.filters}>
              <input
                type="date"
                value={fromDeliveryDate}
                onChange={(e) => setFromDeliveryDate(e.target.value)}
                placeholder="From Date"
              />
              <input
                type="date"
                value={toDeliveryDate}
                onChange={(e) => setToDeliveryDate(e.target.value)}
                placeholder="To Date"
              />
              <select
                value={deliveryManId}
                onChange={(e) => setDeliveryManId(e.target.value)}
              >
                <option value="">All Delivery Boys</option>
                {deliveryMen.map((man) => (
                  <option key={man.DeliveryManID} value={man.DeliveryManID}>
                    {man.Name}
                  </option>
                ))}
              </select>

              <button onClick={handleSearch}>
                <span>🔍</span> Search
              </button>

              <button className={styles.resetBtn} onClick={handleReset}>
                <span>🔄</span> Reset
              </button>

              <div className={styles.exportButtons}>
                <button
                  className={styles.pdfBtn}
                  onClick={exportToPDF}
                  disabled={!orders.length}
                >
                  <span>📄</span> Download PDF
                </button>
                <button
                  className={styles.excelBtn}
                  onClick={exportToExcel}
                  disabled={!orders.length}
                >
                  <span>📊</span> Download Excel
                </button>
              </div>
            </div>

            {/* Status Messages */}
            <div className={styles.statsInfo}>
              {loading && <div className={styles.loading}>Loading...</div>}
              {error && <div className={styles.error}>{error}</div>}
              {!loading && !error && (
                <div className={styles.info}>
                  Total Orders: {totalOrders} | Showing {indexOfFirstRow + 1} to{" "}
                  {Math.min(indexOfLastRow, orders.length)} of {orders.length}{" "}
                  entries
                </div>
              )}
            </div>

            {/* Summary Cards */}
            <div className={styles.summaryGrid}>
              <SummaryCard label="Total Sales" value={summary.totalSales} />
              <SummaryCard label="Cash" value={summary.cash} />
              <SummaryCard label="GPay" value={summary.gpay} />
              <SummaryCard label="Paytm" value={summary.paytm} />
              <SummaryCard label="Bank" value={summary.bank} />
              <SummaryCard label="FOC" value={summary.foc} />
            </div>

            {/* Rows per page selector */}
            <div className={styles.paginationControls}>
              <div className={styles.rowsPerPage}>
                <label>Show:</label>
                <select value={rowsPerPage} onChange={handleRowsPerPageChange}>
                  <option value={10}>10 rows</option>
                  <option value={15}>15 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                </select>
                <span>entries per page</span>
              </div>
            </div>

            {/* Table */}
            <div className={styles.tableContainer} ref={tableRef}>
              <div className={styles.tableWrapper}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Customer</th>
                      <th>Address</th>
                      <th>Area</th>
                      <th>Contact No</th>
                      <th>Delivery Boy</th>
                      <th>Delivery Date</th>
                      <th>Items</th>
                      <th>Weight</th>
                      <th>Qty</th>
                      <th>Toatal Qty</th>
                      <th>Rate</th>
                      <th>Delivery Charge</th>
                      <th>Items Total</th>
                      <th>Payment Recv Date</th>
                      <th>Payment Mode</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map((o, i) => (
                      <tr
                        key={o.AssignID}
                        className={
                          o.DeliveryStatus === "Cancel" ? styles.cancelRow : ""
                        }
                      >
                        <td>{indexOfFirstRow + i + 1}</td>
                        <td>{o.CustomerName}</td>
                        <td>{o.Address}</td>
                        <td>{o.Area}</td>
                        <td>{o.ContactNo}</td>
                        <td>{o.DeliveryBoyName}</td>
                        <td>{formatDate(o.DeliveryDate?.slice(0, 10))}</td>
                        <td>{o.Items}</td>
                        <td>{o.Weights}</td>
                        <td>{o.ItemQuantities}</td>
                        <td>{o.TotalQty}</td>
                        <td>{o.Rates}</td>
                        <td>₹ {o.DeliveryCharge}</td>
                        <td>₹ {o.ItemsTotal}</td>

                        <td>
                          {formatDate(o.PaymentReceivedDate?.slice(0, 10))}
                        </td>
                        <td className={styles.paymentModeCell}>
                          <div>Cash: ₹ {o.Cash}</div>
                          <div>GPay: ₹ {o.GPay}</div>
                          <div>Bank: ₹ {o.BankTransfer}</div>
                          <div>Paytm: ₹ {o.Paytm}</div>
                          <div>FOC: ₹ {o.FOC}</div>
                        </td>
                        <td className={styles.bold}>₹ {o.OrderTotal}</td>
                      </tr>
                    ))}
                    {!loading && orders.length === 0 && (
                      <tr>
                        <td colSpan="16" className={styles.noData}>
                          No delivery data found for the selected filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {orders.length > 0 && (
              <div className={styles.pagination}>
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                  className={styles.pageButton}
                >
                  &laquo; Previous
                </button>

                <div className={styles.pageNumbers}>
                  {getPageNumbers().map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`${styles.pageButton} ${
                        pageNum === currentPage ? styles.activePage : ""
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className={styles.pageDots}>...</span>
                      <button
                        onClick={() => goToPage(totalPages)}
                        className={`${styles.pageButton} ${
                          totalPages === currentPage ? styles.activePage : ""
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={styles.pageButton}
                >
                  Next &raquo;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const SummaryCard = ({ label, value }) => (
  <div className={styles.card}>
    <span>{label}</span>
    <strong>₹ {value || 0}</strong>
  </div>
);

export default DeliverySummary;
