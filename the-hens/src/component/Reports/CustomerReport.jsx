import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCustomerReport } from "../../features/reportSlice";
import { fetchCustomerName } from "../../features/cutomerSlice";
import styles from "./CustomerReport.module.css";

const CustomerReport = () => {
  const dispatch = useDispatch();

  const { customer, customerLoading, error } = useSelector(
    (state) => state.report,
  );
  const { customerName } = useSelector((state) => state.customer);

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [paginatedData, setPaginatedData] = useState([]);

  useEffect(() => {
    dispatch(fetchCustomerName());
  }, [dispatch]);

  // Reset to first page when new data comes in
  useEffect(() => {
    setCurrentPage(1);
  }, [customer?.data]);

  // Update paginated data when customer data or pagination settings change
  useEffect(() => {
    if (customer?.data) {
      const startIndex = (currentPage - 1) * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      setPaginatedData(customer.data.slice(startIndex, endIndex));
    }
  }, [customer?.data, currentPage, rowsPerPage]);

  const handleSearch = () => {
    if (!from || !to) {
      alert("Please select From and To date");
      return;
    }
    dispatch(
      fetchCustomerReport({
        from,
        to,
        customerName: selectedCustomer,
      }),
    );
  };

  const totalOrderAmt =
    customer?.data?.reduce((sum, i) => sum + i.OrderAmount, 0) || 0;
  const totalPaidAmt =
    customer?.data?.reduce((sum, i) => sum + i.PaidAmount, 0) || 0;
  const totalOutstandingAmt =
    customer?.data?.reduce((sum, i) => sum + i.OutstandingAmount, 0) || 0;

  // Pagination handlers
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  // Calculate pagination details
  const totalItems = customer?.data?.length || 0;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, totalItems);

  // Generate page numbers array
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  };

  return (
    <div className={styles.container}>
      <div className={styles.reportCard}>
        <div className={styles.header}>
          <h2 className={styles.title}>Customer Wise Summary</h2>
          <div className={styles.filters}>
            <div className={styles.inputBox}>
              <label>From Date</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.inputBox}>
              <label>To Date</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.inputBox}>
              <label>Select Customer</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className={styles.selectInput}
              >
                <option value="">All Customers</option>
                {customerName?.map((cust) => (
                  <option key={cust.CustomerID} value={cust.CustomerName}>
                    {cust.CustomerName}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleSearch} className={styles.searchBtn}>
              <span className={styles.btnIcon}>📊</span>
              Generate Report
            </button>
          </div>
        </div>

        {/* Executive Summary Bar */}
        {customer?.data?.length > 0 && (
          <div className={styles.summaryBar}>
            <div className={styles.summaryItem}>
              <span>Total Billed</span>
              <h3 className={styles.blueText}>
                <span className={styles.currencyIcon}>₹</span>
                {totalOrderAmt.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className={styles.summaryItem}>
              <span>Total Received</span>
              <h3 className={styles.greenText}>
                <span className={styles.currencyIcon}>₹</span>
                {totalPaidAmt.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className={styles.summaryItem}>
              <span>Outstanding</span>
              <h3 className={styles.redText}>
                <span className={styles.currencyIcon}>₹</span>
                {totalOutstandingAmt.toLocaleString("en-IN")}
              </h3>
            </div>
          </div>
        )}

        {customerLoading && (
          <div className={styles.loader}>
            <div className={styles.spinner}></div>
            <span>Syncing Report Data...</span>
          </div>
        )}
        {error && <div className={styles.errorBox}>⚠️ {error}</div>}

        {customer?.data?.length > 0 && (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date & Order ID</th>
                    <th>Customer Details</th>
                    <th>Items (Wt x Qty @ Rate)</th>
                    <th>Delivery Boy</th>
                    <th>Payment Mode</th>
                    <th>Order Amt</th>
                    <th>Paid</th>
                    <th>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, index) => (
                    <tr key={item.OrderID || index} className={styles.tableRow}>
                      <td className={styles.dateCell}>
                        <div className={styles.dateDisplay}>
                          {new Date(item.OrderDate).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </div>
                        <div className={styles.orderId}>#{item.OrderID}</div>
                      </td>
                      <td>
                        <div className={styles.custName}>
                          {item.CustomerName}
                        </div>
                        <div className={styles.custSub}>{item.ContactNo}</div>
                        <span className={styles.areaTag}>{item.Area}</span>
                      </td>
                      <td className={styles.itemCell}>
                        {item.ItemDetails?.split(" | ").map((line, i) => (
                          <div key={i} className={styles.itemRow}>
                            <span className={styles.bullet}>•</span> {line}
                          </div>
                        ))}
                      </td>
                      <td className={styles.deliveryCell}>
                        <span
                          className={
                            item.DeliveryBoyName
                              ? styles.boyName
                              : styles.naText
                          }
                        >
                          {item.DeliveryBoyName || "N/A"}
                        </span>
                      </td>
                      <td className={styles.paymentCell}>
                        <span className={styles.paymentBadge}>
                          {item.PaymentModeDetails || "Pending"}
                        </span>
                      </td>
                      <td className={styles.boldAmount}>
                        ₹{item.OrderAmount.toLocaleString("en-IN")}
                      </td>
                      <td className={styles.greenAmount}>
                        ₹{item.PaidAmount.toLocaleString("en-IN")}
                      </td>
                      <td>
                        <span
                          className={
                            item.OutstandingAmount > 0
                              ? styles.pillRed
                              : styles.pillGreen
                          }
                        >
                          ₹{item.OutstandingAmount.toLocaleString("en-IN")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className={styles.tfoot}>
                  <tr>
                    <td colSpan="5" className={styles.footLabel}>
                      <strong>Grand Total</strong>
                    </td>
                    <td className={styles.boldAmount}>
                      ₹{totalOrderAmt.toLocaleString("en-IN")}
                    </td>
                    <td className={styles.greenAmount}>
                      ₹{totalPaidAmt.toLocaleString("en-IN")}
                    </td>
                    <td className={styles.redText}>
                      ₹{totalOutstandingAmt.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination Section */}
            <div className={styles.paginationContainer}>
              <div className={styles.rowsPerPage}>
                <label>Show</label>
                <select
                  value={rowsPerPage}
                  onChange={handleRowsPerPageChange}
                  className={styles.rowsSelect}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <label>entries</label>
              </div>

              <div className={styles.paginationInfo}>
                Showing {startItem} to {endItem} of {totalItems} entries
              </div>

              <div className={styles.pagination}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={styles.pageBtn}
                  aria-label="Previous page"
                >
                  <span className={styles.pageIcon}>←</span>
                  <span className={styles.pageText}>Prev</span>
                </button>

                {getPageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      typeof page === "number" && handlePageChange(page)
                    }
                    className={`${styles.pageBtn} ${
                      currentPage === page ? styles.activePage : ""
                    } ${page === "..." ? styles.disabledPage : ""}`}
                    disabled={page === "..."}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={styles.pageBtn}
                  aria-label="Next page"
                >
                  <span className={styles.pageText}>Next</span>
                  <span className={styles.pageIcon}>→</span>
                </button>
              </div>
            </div>
          </>
        )}

        {!customerLoading && customer?.data?.length === 0 && (
          <div className={styles.noData}>
            <div className={styles.noDataIcon}>📋</div>
            <h3>No Data Available</h3>
            <p>Please select filters to view the summary report.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerReport;
