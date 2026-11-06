import { useEffect, useRef, useState } from "react";
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
import CustomerOutstandingModal from "./CustomerOutstandingModal";
import styles from "./CustomerOutstanding.module.css";

const initialFilters = {
  customerName: "",
  area: "",
  from: "",
  to: "",
};

const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const CustomerOutstanding = () => {
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);

  const {
    customers = [],
    summary = {},
    totalCustomers = 0,
    loading = false,
    error = null,
  } = useSelector((state) => state.report.customerOutstanding);

  const customerNames = useSelector(
    (state) => state.customer.customerName || [],
  );

  const customerLoading = useSelector((state) => state.customer.isLoading);

  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    open: false,
    type: "sales",
    customer: null,
  });

  const pageSize = 15;

  useEffect(() => {
    dispatch(fetchCustomerOutstanding({}));
    dispatch(fetchCustomerName());
  }, [dispatch]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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
    setShowCustomerDropdown(false);

    dispatch(fetchCustomerOutstanding(cleanFilters));
  };

  const handleReset = () => {
    setFilters({ ...initialFilters });
    setAppliedFilters({ ...initialFilters });
    setCurrentPage(1);
    setShowCustomerDropdown(false);

    dispatch(fetchCustomerOutstanding({}));
  };

  const handleRefresh = () => {
    dispatch(fetchCustomerOutstanding(appliedFilters));
  };

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

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Customer_Outstanding_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
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

  const openDetails = (type, customer = null) => {
    setModalConfig({
      open: true,
      type,
      customer,
    });
  };

  const closeDetails = () => {
    setModalConfig((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const totalPages = Math.max(1, Math.ceil(customers.length / pageSize));

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const visibleCustomers = customers.slice(startIndex, endIndex);

  const cards = [
    {
      title: "Total Sales",
      type: "sales",
      value: currency(summary.TotalSales),
      icon: FaShoppingCart,
      color: "blue",
    },
    {
      title: "Payment Received",
      type: "received",
      value: currency(summary.TotalReceived),
      icon: FaMoneyBillWave,
      color: "green",
    },
    {
      title: "Outstanding",
      type: "outstanding",
      value: currency(summary.TotalOutstanding),
      icon: FaWallet,
      color: "red",
    },
    {
      title: "Pending Verification",
      type: "pending",
      value: currency(summary.PendingVerification),
      icon: FaClock,
      color: "orange",
    },
    {
      title: "Verified Payment",
      type: "verified",
      value: currency(summary.VerifiedAmount),
      icon: FaCheckCircle,
      color: "purple",
    },
    {
      title: "Total Customers",
      type: null,
      value: totalCustomers,
      icon: FaUsers,
      color: "teal",
    },
  ];

  const amountButton = (type, value, customer, className = "") => (
    <button
      type="button"
      className={`${styles.amountLink || ""} ${className}`}
      onClick={() => openDetails(type, customer)}
      title={`View ${type} order details`}
      disabled={loading}
    >
      {currency(value)}
    </button>
  );

  return (
    <div className={styles.container}>
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

      <form className={styles.filterSection} onSubmit={handleSearch}>
        <div className={styles.sectionHeading}>
          <FaFilter />
          <h3>Report Filters</h3>
        </div>

        <div className={styles.filterGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="outstandingCustomer">Customer Name</label>

            <div ref={dropdownRef} className={styles.customerDropdownWrapper}>
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
                />
              </div>

              {showCustomerDropdown && (
                <div className={styles.customerDropdown}>
                  {customerLoading && customerNames.length === 0 ? (
                    <div className={styles.dropdownMessage}>
                      Loading customers...
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer, index) => (
                      <button
                        key={`${customer.id || customer.name}-${index}`}
                        type="button"
                        className={styles.customerOption}
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
              min={filters.from || undefined}
              value={filters.to}
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

      <div className={styles.summaryGrid}>
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <button
              key={card.title}
              type="button"
              className={`${styles.summaryCard} ${styles[card.color]} ${
                card.type ? styles.clickableCard || "" : ""
              }`}
              onClick={() => {
                if (card.type) openDetails(card.type);
              }}
              disabled={loading || !card.type}
              style={{ textAlign: "left", width: "100%" }}
            >
              <div className={styles.cardContent}>
                <span className={styles.cardLabel}>{card.title}</span>

                <h3 className={styles.cardValue}>
                  {loading ? "..." : card.value}
                </h3>

                {card.type && (
                  <small className={styles.viewDetails || ""}>
                    Click to view orders
                  </small>
                )}
              </div>

              <div className={styles.cardIcon}>
                <Icon />
              </div>
            </button>
          );
        })}
      </div>

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

        {error && (
          <div className={styles.errorBox} role="alert">
            {typeof error === "string"
              ? error
              : error.message || "Unable to load report"}
          </div>
        )}

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
                      key={`${customer.CustomerName}-${customer.ContactNo}-${startIndex + index}`}
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
                        {amountButton("sales", customer.TotalSales, customer)}
                      </td>

                      <td className={styles.receivedAmount}>
                        {amountButton(
                          "received",
                          customer.TotalReceived,
                          customer,
                        )}
                      </td>

                      <td className={styles.verifiedAmount}>
                        {amountButton(
                          "verified",
                          customer.VerifiedAmount,
                          customer,
                        )}
                      </td>

                      <td>
                        {amountButton(
                          "pending",
                          customer.PendingVerification,
                          customer,
                        )}
                      </td>

                      <td>
                        {amountButton(
                          "outstanding",
                          customer.Outstanding,
                          customer,
                        )}
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

            <div className={styles.pagination}>
              <p>
                Showing {startIndex + 1}–{Math.min(endIndex, customers.length)}{" "}
                of {customers.length} records
              </p>

              <div className={styles.pageControls}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                >
                  Previous
                </button>

                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
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

      {modalConfig.open && (
        <CustomerOutstandingModal
          key={`${modalConfig.type}-${modalConfig.customer?.CustomerName || "all"}-${modalConfig.customer?.ContactNo || ""}`}
          open={true}
          onClose={closeDetails}
          type={modalConfig.type}
          customer={modalConfig.customer}
          filters={appliedFilters}
        />
      )}
    </div>
  );
};

export default CustomerOutstanding;
