import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FaSearch,
  FaSyncAlt,
  FaFileCsv,
  FaWallet,
  FaMoneyBillWave,
  FaCheckCircle,
  FaClock,
  FaShoppingCart,
  FaUsers,
  FaTimes,
  FaFilter,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { fetchCustomerName } from "../../features/cutomerSlice";
import { fetchCustomerOutstanding } from "../../features/reportSlice";
import styles from "./CustomerOutstanding.module.css";

const initialFilters = {
  customerName: "",
  area: "",
  from: "",
  to: "",
};

const currency = (value) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
};

const CustomerOutstanding = () => {
  const dispatch = useDispatch();

  const {
    customers = [],
    summary = {},
    totalCustomers = 0,
    loading = false,
    error = null,
  } = useSelector((state) => state.report.customerOutstanding);

  //   const customerState = useSelector((state) => state.customer);

  const customerNames = useSelector(
    (state) => state.customer.customerName || [],
  );
  const customerLoading = useSelector((state) => state.customer.isLoading);

  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 15;

  // =============================================
  // INITIAL DATA FETCH
  // =============================================

  useEffect(() => {
    dispatch(fetchCustomerOutstanding({}));
    dispatch(fetchCustomerName());
  }, [dispatch]);

  // =============================================
  // HANDLE FILTER INPUTS
  // =============================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =============================================
  // APPLY FILTERS
  // =============================================

  const handleSearch = (e) => {
    e.preventDefault();

    if ((filters.from && !filters.to) || (!filters.from && filters.to)) {
      alert("Please select both From Date and To Date.");
      return;
    }

    if (filters.from && filters.to && filters.from > filters.to) {
      alert("From Date cannot be greater than To Date.");
      return;
    }

    const cleanFilters = {
      customerName: filters.customerName.trim(),
      area: filters.area.trim(),
      from: filters.from,
      to: filters.to,
    };

    setAppliedFilters(cleanFilters);
    setCurrentPage(1);

    dispatch(fetchCustomerOutstanding(cleanFilters));
  };

  // =============================================
  // RESET FILTERS
  // =============================================

  const handleReset = () => {
    setFilters({ ...initialFilters });
    setAppliedFilters({ ...initialFilters });
    setCurrentPage(1);

    dispatch(fetchCustomerOutstanding({}));
  };

  // =============================================
  // REFRESH DATA
  // =============================================

  const handleRefresh = () => {
    dispatch(fetchCustomerOutstanding(appliedFilters));
  };

  // =============================================
  // CSV EXPORT
  // =============================================

  const handleExport = () => {
    if (!customers.length) return;

    const columns = [
      "Customer Name",
      "Contact No",
      "Area",
      "Total Orders",
      "Pending Orders",
      "Total Sales",
      "Total Received",
      "Verified Amount",
      "Pending Verification",
      "Other Verification",
      "Outstanding",
    ];

    const data = customers.map((customer) => [
      customer.CustomerName,
      customer.ContactNo,
      customer.Area,
      customer.TotalOrders,
      customer.PendingOrders,
      customer.TotalSales,
      customer.TotalReceived,
      customer.VerifiedAmount,
      customer.PendingVerification,
      customer.OtherVerification,
      customer.Outstanding,
    ]);

    // Prevent spreadsheet formula injection when CSV
    // is opened in Excel or similar applications.
    const escapeCsv = (value) => {
      let text = String(value ?? "");

      if (/^[\s]*[=+\-@\t\r]/.test(text)) {
        text = `'${text}`;
      }

      return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [columns, ...data]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `Customer_Outstanding_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const normalizedCustomers = customerNames
    .map((customer) => ({
      id: customer.CustomerId,
      name: customer.CustomerName?.trim() || "",
      area: customer.Area?.trim() || "",
      contact: customer.Contact_No || "",
    }))
    .filter((customer) => customer.name);

  const filteredCustomers = normalizedCustomers
    .filter((customer) =>
      customer.name
        .toLowerCase()
        .includes(filters.customerName.trim().toLowerCase()),
    )
    .slice(0, 30);

  const handleCustomerSelect = (customer) => {
    setFilters((prev) => ({
      ...prev,
      customerName: customer.name,
    }));

    setShowCustomerDropdown(false);
  };
  // =============================================
  // PAGINATION
  // =============================================

  const totalPages = Math.max(1, Math.ceil(customers.length / pageSize));

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const visibleCustomers = customers.slice(startIndex, endIndex);

  // =============================================
  // SUMMARY CARDS
  // =============================================

  const cards = [
    {
      title: "Total Sales",
      value: currency(summary.TotalSales),
      icon: FaShoppingCart,
      color: "blue",
    },
    {
      title: "Payment Received",
      value: currency(summary.TotalReceived),
      icon: FaMoneyBillWave,
      color: "green",
    },
    {
      title: "Outstanding",
      value: currency(summary.TotalOutstanding),
      icon: FaWallet,
      color: "red",
    },
    {
      title: "Pending Verification",
      value: currency(summary.PendingVerification),
      icon: FaClock,
      color: "orange",
    },
    {
      title: "Verified Payment",
      value: currency(summary.VerifiedAmount),
      icon: FaCheckCircle,
      color: "purple",
    },
    {
      title: "Total Customers",
      value: totalCustomers,
      icon: FaUsers,
      color: "teal",
    },
  ];

  return (
    <div className={styles.container}>
      {/* ===========================================
          HEADER
      =========================================== */}

      <div className={styles.header}>
        <div>
          <h2 className={styles.heading}>Customer Outstanding Report</h2>

          <p className={styles.subtitle}>
            Track unpaid balances, received payments and pending verification
            customer-wise.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={handleRefresh}
            disabled={loading}
          >
            <FaSyncAlt />
            Refresh
          </button>

          <button
            type="button"
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={loading || customers.length === 0}
          >
            <FaFileCsv />
            Export CSV
          </button>
        </div>
      </div>

      {/* ===========================================
          SEARCH FILTERS
      =========================================== */}

      <form className={styles.filterSection} onSubmit={handleSearch}>
        <div className={styles.sectionHeading}>
          <FaFilter />
          <h3>Report Filters</h3>
        </div>

        <div className={styles.filterGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="outstandingCustomer">Customer Name</label>

            <div className={styles.customerDropdownWrapper}>
              <div className={styles.inputWrapper}>
                <FaSearch className={styles.inputIcon} />

                <input
                  id="outstandingCustomer"
                  type="text"
                  name="customerName"
                  placeholder="Search or select customer"
                  value={filters.customerName}
                  autoComplete="off"
                  onChange={(e) => {
                    handleChange(e);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => {
                    // Allow dropdown selection to complete
                    setTimeout(() => {
                      setShowCustomerDropdown(false);
                    }, 150);
                  }}
                />
              </div>

              {showCustomerDropdown && (
                <div className={styles.customerDropdown}>
                  {customerLoading && customerNames.length === 0 ? (
                    <div className={styles.dropdownMessage}>
                      Loading customers...
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className={styles.customerOption}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        <FaUsers />

                        <div>
                          <strong>{customer.name}</strong>

                          <small
                            style={{
                              display: "block",
                              color: "#64748b",
                              marginTop: "3px",
                            }}
                          >
                            {customer.area}
                            {customer.contact ? ` • ${customer.contact}` : ""}
                          </small>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className={styles.dropdownMessage}>
                      No customers found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="outstandingArea">Area</label>

            <div className={styles.inputWrapper}>
              <FaMapMarkerAlt className={styles.inputIcon} />

              <input
                id="outstandingArea"
                type="text"
                name="area"
                placeholder="Search area"
                value={filters.area}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="outstandingFrom">From Date</label>

            <input
              id="outstandingFrom"
              type="date"
              name="from"
              value={filters.from}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="outstandingTo">To Date</label>

            <input
              id="outstandingTo"
              type="date"
              name="to"
              value={filters.to}
              min={filters.from || undefined}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className={styles.filterActions}>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={handleReset}
            disabled={loading}
          >
            <FaTimes />
            Reset
          </button>

          <button type="submit" className={styles.searchBtn} disabled={loading}>
            <FaSearch />
            {loading ? "Searching..." : "Search Report"}
          </button>
        </div>
      </form>

      {/* ===========================================
          SUMMARY CARDS
      =========================================== */}

      <div className={styles.summaryGrid}>
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className={`${styles.summaryCard} ${styles[card.color]}`}
            >
              <div className={styles.cardContent}>
                <span className={styles.cardLabel}>{card.title}</span>

                <h3 className={styles.cardValue}>
                  {loading ? "..." : card.value}
                </h3>
              </div>

              <div className={styles.cardIcon}>
                <Icon />
              </div>
            </div>
          );
        })}
      </div>

      {/* ===========================================
          CUSTOMER OUTSTANDING TABLE
      =========================================== */}

      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <div>
            <h3>Customer Outstanding Details</h3>

            <p>
              {loading
                ? "Loading customer records..."
                : `${customers.length} customers found`}
            </p>
          </div>

          <span className={styles.recordBadge}>{totalCustomers} Customers</span>
        </div>

        {/* ERROR */}
        {error && (
          <div className={styles.errorBox} role="alert">
            {typeof error === "string"
              ? error
              : error.message || "Unable to load report"}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className={styles.loadingBox}>
            <div className={styles.spinner} />
            <p>Fetching customer outstanding report...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className={styles.emptyState}>
            <FaWallet />
            <h3>No Outstanding Records Found</h3>
            <p>No customers matched the selected filters.</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Sr.</th>
                    <th>Customer Details</th>
                    <th>Area</th>
                    <th>Total Orders</th>
                    <th>Pending Orders</th>
                    <th>Total Sales</th>
                    <th>Received</th>
                    <th>Verified</th>
                    <th>Pending Verification</th>
                    <th>Outstanding</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleCustomers.map((customer, index) => (
                    <tr
                      key={`${customer.CustomerName}-${
                        customer.ContactNo
                      }-${startIndex + index}`}
                    >
                      <td className={styles.serial}>
                        {startIndex + index + 1}
                      </td>

                      <td>
                        <div className={styles.customerCell}>
                          <span className={styles.customerName}>
                            {customer.CustomerName || "-"}
                          </span>

                          <span className={styles.contact}>
                            {customer.ContactNo || "-"}
                          </span>
                        </div>
                      </td>

                      <td>{customer.Area || "-"}</td>

                      <td>
                        <span className={styles.orderCount}>
                          {customer.TotalOrders || 0}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            Number(customer.PendingOrders) > 0
                              ? styles.pendingOrderBadge
                              : styles.normalBadge
                          }
                        >
                          {customer.PendingOrders || 0}
                        </span>
                      </td>

                      <td className={styles.amount}>
                        {currency(customer.TotalSales)}
                      </td>

                      <td className={styles.receivedAmount}>
                        {currency(customer.TotalReceived)}
                      </td>

                      <td className={styles.verifiedAmount}>
                        {currency(customer.VerifiedAmount)}
                      </td>

                      <td>
                        <span
                          className={
                            Number(customer.PendingVerification) > 0
                              ? styles.pendingAmount
                              : styles.zeroAmount
                          }
                        >
                          {currency(customer.PendingVerification)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            Number(customer.Outstanding) > 0
                              ? styles.outstandingAmount
                              : styles.zeroAmount
                          }
                        >
                          {currency(customer.Outstanding)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr>
                    <td colSpan={5}>
                      <strong>Grand Total</strong>
                    </td>

                    <td>{currency(summary.TotalSales)}</td>

                    <td>{currency(summary.TotalReceived)}</td>

                    <td>{currency(summary.VerifiedAmount)}</td>

                    <td>{currency(summary.PendingVerification)}</td>

                    <td>{currency(summary.TotalOutstanding)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ======================================
                PAGINATION
            ====================================== */}

            <div className={styles.pagination}>
              <p>
                Showing {startIndex + 1}–{Math.min(endIndex, customers.length)}{" "}
                of {customers.length} records
              </p>

              <div className={styles.pageControls}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  Previous
                </button>

                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <p className={styles.footerNote}>
        Outstanding = Total Sales − Payment Received. Pending verification is
        shown separately and is already included in received payments. Cancelled
        orders are excluded by the backend.
      </p>
    </div>
  );
};

export default CustomerOutstanding;
