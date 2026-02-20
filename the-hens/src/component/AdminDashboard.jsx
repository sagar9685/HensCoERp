import React, { useEffect, useState } from "react";
import styles from "./AdminDashboard.module.css";
import {
  FaEye,
  FaEdit,
  FaPlus,
  FaSearch,
  FaFilter,
  FaSyncAlt,
  FaShieldAlt,
  FaFileInvoiceDollar,
} from "react-icons/fa";
import { PiEggBold } from "react-icons/pi";
import AddOrderModal from "./AdminOrderModal/AddOrderModal";
import AddCustomerModal from "./AddCustomerModal";
import { useDispatch, useSelector } from "react-redux";
import { verifyPayment, markVerified } from "../features/paymentVerifySlice";
import { toast } from "react-toastify";
import { fetchOrder } from "../features/orderSlice";
import PaymentModal from "./PaymentModal";
import Loader from "./Loader";
import InvoiceGenerator from "./OrderInvoice";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const AdminDashboard = () => {
  const today = new Date().toISOString().split("T")[0];

  const [filters, setFilters] = useState({
    ProductId: "",
    ProductName: "",
    ProductType: "",
    customer: "",
    fromDate: today,
    toDate: today,
    orderStatus: "",
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const dispatch = useDispatch();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [verificationRemarks, setVerificationRemarks] = useState("");

  const [isFilterLoading, setIsFilterLoading] = useState(false);

  const orders = useSelector((state) => state.order.record);
  const loading = useSelector((state) => state.order.loading);

  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Fix: Proper date comparison function
  const isDateInRange = (orderDate, fromDate, toDate) => {
    if (!orderDate) return false;

    const date = new Date(orderDate);
    date.setHours(0, 0, 0, 0);

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999); // Include entire end date
      return date >= from && date <= to;
    }
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      return date >= from;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      return date <= to;
    }
    return true;
  };

  // Filter statistics based on filteredData
  const filterStats = {
    totalOrders: filteredData.length,
    totalItems: filteredData.reduce((acc, order) => {
      const quantities = order.Quantities
        ? order.Quantities.split(",").map(Number)
        : [];
      const totalQty = quantities.reduce((sum, q) => sum + (q || 0), 0);
      return acc + totalQty;
    }, 0),
    totalDueAmount: filteredData.reduce((acc, order) => {
      return acc + (order.ShortAmount || 0);
    }, 0),
    // Isse filterStats object ke andar replace karein
    totalPending: filteredData.filter((order) => {
      const status = (order.OrderStatus || "").toLowerCase().trim();
      return (
        status === "pending" ||
        status === "n/a" ||
        status === "" ||
        status === null
      );
    }).length,
  };

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredData.slice(
    indexOfFirstRecord,
    indexOfLastRecord,
  );

  const totalPages = Math.ceil(filteredData.length / recordsPerPage);

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return styles.statusPending;
      case "complete":
      case "completed":
        return styles.statusCompleted;
      case "cancel":
        return styles.statusCancelled;
      case "processing":
        return styles.statusProcessing;
      default:
        return "";
    }
  };

  const formatPaymentSummary = (summary) => {
    if (!summary) return "-";
    return summary
      .split("|")
      .map((item) => item.trim())
      .filter((item) => {
        const amount = parseFloat(item.split(":")[1]);
        return amount > 0;
      })
      .join(" | ");
  };

  useEffect(() => {
    dispatch(fetchOrder());
  }, [dispatch]);

  // Initialize filtered data with today's orders
  useEffect(() => {
    if (orders && orders.length > 0) {
      const todayOrders = orders.filter((item) => {
        const orderDate = new Date(item.OrderDate).toISOString().split("T")[0];
        return orderDate === today;
      });
      setFilteredData(todayOrders);
    }
  }, [orders]);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // const handleStatusChange = (row, value) => {
  //   if (value === "Verified") {
  //     dispatch(markVerified({ paymentId: row.PaymentID }))
  //       .unwrap()
  //       .then(() => {
  //         dispatch(fetchOrder());
  //         toast.success("Payment marked as Verified!");
  //         setIsPaymentModalOpen(false);
  //       })
  //       .catch((err) => toast.error(err.message || "Failed to verify"));
  //   }

  //   if (value === "Incomplete") {
  //     setSelectedPayment(row);
  //     setIsPaymentModalOpen(true);
  //   }
  // };

  const handleStatusChange = (row, value) => {
    if (value === "Verified") {
      setSelectedPayment(row);
      setIsPaymentModalOpen(true); // modal open karo
    }

    if (value === "Incomplete") {
      setSelectedPayment(row);
      setIsPaymentModalOpen(true);
    }
  };

  const handleVerifyPayment = () => {
    dispatch(
      verifyPayment({
        paymentId: selectedPayment.PaymentID,
        receivedAmount: Number(receivedAmount),
        verificationRemarks,
      }),
    )
      .unwrap()
      .then(() => {
        setTimeout(() => dispatch(fetchOrder()), 200);
        toast.success("Payment updated successfully!");
        setIsPaymentModalOpen(false);
        setReceivedAmount("");
      })
      .catch((err) =>
        toast.error(err.message || "Payment verification failed"),
      );
  };

  const handleClear = () => {
    const resetFilters = {
      ProductId: "",
      ProductName: "",
      ProductType: "",
      customer: "",
      fromDate: today,
      toDate: today,
      orderStatus: "",
    };
    setFilters(resetFilters);

    // Reset to today's orders
    if (orders && orders.length > 0) {
      const todayOrders = orders.filter((item) => {
        const orderDate = new Date(item.OrderDate).toISOString().split("T")[0];
        return orderDate === today;
      });
      setFilteredData(todayOrders);
    }
    setCurrentPage(1);
  };

  const handleSearch = () => {
    if (!orders || orders.length === 0) return;

    setIsFilterLoading(true);

    setTimeout(() => {
      let filtered = [...orders];

      // 1. Date Range Filter
      if (filters.fromDate || filters.toDate) {
        filtered = filtered.filter((item) =>
          isDateInRange(item.OrderDate, filters.fromDate, filters.toDate),
        );
      }

      // 2. Order Status Filter (FIXED LOGIC)
      if (filters.orderStatus) {
        const selectedStatus = filters.orderStatus.toLowerCase().trim();

        filtered = filtered.filter((item) => {
          // Item ka status safely extract karein
          const itemStatus = (item.OrderStatus || "").toLowerCase().trim();

          if (selectedStatus === "complete") {
            // "complete" aur "completed" dono ko match karega
            return itemStatus === "complete" || itemStatus === "completed";
          }

          if (selectedStatus === "pending") {
            // N/A ya Empty status ko bhi Pending treat kar sakte hain
            return (
              itemStatus === "pending" ||
              itemStatus === "n/a" ||
              itemStatus === ""
            );
          }

          return itemStatus === selectedStatus;
        });
      }

      // 3. Text Filters (Customer Name, Product ID etc.)
      Object.keys(filters).forEach((key) => {
        // In keys ko skip karein kyunki inka logic upar likha ja chuka hai
        if (["fromDate", "toDate", "orderStatus"].includes(key)) return;

        const searchTerm = filters[key].trim().toLowerCase();
        if (searchTerm) {
          filtered = filtered.filter((item) => {
            switch (key) {
              case "ProductId":
                // Dashboard mein OrderID display ho raha hai filter ProductId ke naam se hai
                return item.OrderID?.toString()
                  .toLowerCase()
                  .includes(searchTerm);
              case "customer":
                return item.CustomerName?.toLowerCase().includes(searchTerm);
              case "ProductName":
                return item.ProductNames?.toLowerCase().includes(searchTerm);
              default:
                return item[key]?.toString().toLowerCase().includes(searchTerm);
            }
          });
        }
      });

      setFilteredData(filtered);
      setCurrentPage(1);
      setIsFilterLoading(false);
    }, 500);
  };

  const handleAddOrder = (orderData) => {
    console.log("New order data:", orderData);
    alert("Order created successfully!");
  };

  const handleAddCustomer = (customerData) => {
    console.log("New customer data:", customerData);
    alert("Customer added successfully!");
  };

  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const handleGenerateInvoice = (orderRow) => {
    setSelectedOrderForInvoice(orderRow);
    setIsInvoiceModalOpen(true);
  };

  const closeInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setSelectedOrderForInvoice(null);
  };

  // Fix: Status count function to handle all cases
  const getStatusCount = (status) => {
    // filteredData use karne se wahi count dikhega jo screen par filter ho chuka hai
    if (!filteredData) return 0;

    return filteredData.filter((order) => {
      const orderStatus = (order.OrderStatus || "").toLowerCase().trim();
      const targetStatus = status.toLowerCase();

      if (targetStatus === "pending") {
        return (
          orderStatus === "pending" ||
          orderStatus === "n/a" ||
          orderStatus === "" ||
          orderStatus === null
        );
      }
      if (targetStatus === "complete") {
        return orderStatus === "complete" || orderStatus === "completed";
      }
      return orderStatus === targetStatus;
    }).length;
  };

  const StatsSkeleton = () => (
    <>
      <div className={styles.statItem}>
        <Skeleton width={60} height={32} />
        <Skeleton width={80} height={16} />
      </div>
      <div className={styles.statItem}>
        <Skeleton width={60} height={32} />
        <Skeleton width={80} height={16} />
      </div>
      <div className={styles.statItem}>
        <Skeleton width={80} height={32} />
        <Skeleton width={100} height={16} />
      </div>
      <div className={styles.statItem}>
        <Skeleton width={60} height={32} />
        <Skeleton width={90} height={16} />
      </div>
    </>
  );

  const TableRowSkeleton = () => (
    <>
      {[...Array(5)].map((_, idx) => (
        <tr key={idx}>
          {[...Array(19)].map((_, cellIdx) => (
            <td key={cellIdx}>
              <Skeleton />
            </td>
          ))}
        </tr>
      ))}
    </>
  );

  return (
    <div className={styles.container}>
      {/* HEADER SECTION */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <PiEggBold className={styles.titleIcon} />
            <div>
              <h1 className={styles.mainTitle}>Product Management Dashboard</h1>
              <p className={styles.subtitle}>
                Manage and monitor all product records
              </p>
            </div>
          </div>
          <div
            className={`${styles.statsCard} ${
              isFilterLoading ? styles.statsLoading : ""
            }`}
          >
            {isFilterLoading ? (
              <StatsSkeleton />
            ) : (
              <>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>
                    {filterStats.totalOrders}
                  </span>
                  <span className={styles.statLabel}>Total Orders</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>
                    {filterStats.totalItems}
                  </span>
                  <span className={styles.statLabel}>Total Items</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>
                    ₹{filterStats.totalDueAmount}
                  </span>
                  <span className={styles.statLabel}>Total Due Amount</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>
                    {filterStats.totalPending}
                  </span>
                  <span className={styles.statLabel}>Total Pending</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT CARD */}
      <div className={styles.contentCard}>
        {/* FILTERS SECTION */}
        <div className={styles.filterSection}>
          <div className={styles.filterHeader}>
            <FaFilter className={styles.filterIcon} />
            <h3>Filter Product</h3>
            {isFilterLoading && (
              <span className={styles.filterLoadingBadge}>
                <FaSyncAlt className={styles.spinningIcon} /> Applying
                filters...
              </span>
            )}
          </div>

          <div className={styles.filterGrid}>
            {/* Date Filters */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>FROM DATE</label>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleChange}
                className={styles.input}
                disabled={isFilterLoading}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>TO DATE</label>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                onChange={handleChange}
                className={styles.input}
                disabled={isFilterLoading}
              />
            </div>

            {/* Order Status Filter */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>ORDER STATUS</label>
              <select
                name="orderStatus"
                value={filters.orderStatus}
                onChange={handleChange}
                className={styles.select}
                disabled={isFilterLoading}
              >
                <option value="">All Status</option>
                <option value="pending">
                  Pending ({getStatusCount("pending")})
                </option>
                <option value="processing">
                  Processing ({getStatusCount("processing")})
                </option>
                <option value="complete">
                  Complete ({getStatusCount("complete")})
                </option>
                <option value="cancel">
                  Cancel ({getStatusCount("cancel")})
                </option>
              </select>
            </div>

            {/* Other filters */}
            {Object.keys(filters)
              .filter(
                (key) =>
                  key !== "fromDate" &&
                  key !== "toDate" &&
                  key !== "orderStatus",
              )
              .map((key) => (
                <div key={key} className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    {key.replace(/([A-Z])/g, " $1").toUpperCase()}
                  </label>
                  <input
                    type="text"
                    placeholder={`Search ${key
                      .replace(/([A-Z])/g, " $1")
                      .toLowerCase()}`}
                    name={key}
                    value={filters[key]}
                    onChange={handleChange}
                    className={styles.input}
                    disabled={isFilterLoading}
                  />
                </div>
              ))}
          </div>

          {/* ACTION BUTTONS */}
          <div className={styles.actionButtons}>
            <button
              className={styles.clearBtn}
              onClick={handleClear}
              disabled={isFilterLoading}
            >
              <FaSyncAlt className={styles.btnIcon} />
              Clear Filters
            </button>
            <button
              className={styles.searchBtn}
              onClick={handleSearch}
              disabled={isFilterLoading}
            >
              {isFilterLoading ? (
                <>
                  <FaSyncAlt
                    className={`${styles.btnIcon} ${styles.spinningIcon}`}
                  />
                  Filtering...
                </>
              ) : (
                <>
                  <FaSearch className={styles.btnIcon} />
                  Search Product
                </>
              )}
            </button>

            <button
              className={styles.addOrder}
              onClick={() => setIsModalOpen(true)}
              disabled={isFilterLoading}
            >
              <FaPlus className={styles.btnIcon} />
              Add New Order
            </button>

            <button
              className={styles.addBtn}
              onClick={() => setIsCustomerModalOpen(true)}
              disabled={isFilterLoading}
            >
              <FaPlus className={styles.btnIcon} />
              Add New Customer
            </button>
          </div>
        </div>

        {/* Active Filters Display */}
        {(filters.orderStatus ||
          filters.fromDate !== today ||
          filters.toDate !== today ||
          Object.keys(filters).some(
            (key) =>
              key !== "fromDate" &&
              key !== "toDate" &&
              key !== "orderStatus" &&
              filters[key],
          )) && (
          <div className={styles.activeFilters}>
            <span className={styles.activeFiltersLabel}>Active Filters:</span>
            {filters.orderStatus && (
              <span className={styles.filterTag}>
                Status: {filters.orderStatus}
                <button
                  onClick={() => setFilters({ ...filters, orderStatus: "" })}
                >
                  ×
                </button>
              </span>
            )}
            {filters.fromDate !== today && (
              <span className={styles.filterTag}>
                From: {filters.fromDate}
                <button
                  onClick={() => setFilters({ ...filters, fromDate: today })}
                >
                  ×
                </button>
              </span>
            )}
            {filters.toDate !== today && (
              <span className={styles.filterTag}>
                To: {filters.toDate}
                <button
                  onClick={() => setFilters({ ...filters, toDate: today })}
                >
                  ×
                </button>
              </span>
            )}
            {Object.keys(filters)
              .filter(
                (key) =>
                  key !== "fromDate" &&
                  key !== "toDate" &&
                  key !== "orderStatus" &&
                  filters[key],
              )
              .map((key) => (
                <span key={key} className={styles.filterTag}>
                  {key}: {filters[key]}
                  <button onClick={() => setFilters({ ...filters, [key]: "" })}>
                    ×
                  </button>
                </span>
              ))}
          </div>
        )}

        {/* TABLE SECTION */}
        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>
              <FaShieldAlt className={styles.tableIcon} />
              Product Records
            </h3>
            <span className={styles.tableCounter}>
              {isFilterLoading ? (
                <Skeleton width={100} />
              ) : (
                `${filteredData.length} records found`
              )}
            </span>
          </div>

          <div className={styles.tableContainer}>
            {(loading || isFilterLoading) && (
              <div className={styles.loaderWrapper}>
                <Loader />
              </div>
            )}

            {!loading && !isFilterLoading && filteredData.length === 0 && (
              <p>No orders found...</p>
            )}

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Product Name</th>
                  <th>Customer Name</th>
                  <th>Address</th>
                  <th>Area</th>
                  <th>Contact No</th>
                  <th>Product Type</th>
                  <th>Delivery Charge</th>
                  <th>Order Date</th>
                  <th>Delivery Date</th>
                  <th>Delivery Man</th>
                  <th>Order Status</th>
                  <th>Payment Mode</th>
                  <th>Order Taken By</th>
                  <th>Remark</th>
                  <th>Payment Status</th>
                  <th>Actions</th>
                  <th>Verfication Remark</th>
                </tr>
              </thead>
              <tbody>
                {isFilterLoading ? (
                  <TableRowSkeleton />
                ) : currentRecords.length > 0 ? (
                  currentRecords.map((row, index) => (
                    <tr
                      key={row.id || index}
                      className={
                        index % 2 === 0
                          ? styles.tableRowEven
                          : styles.tableRowOdd
                      }
                    >
                      <td>
                        <span className={styles.productId}>{row.OrderID}</span>
                      </td>
                      <td className={styles.productName}>{row.ProductNames}</td>
                      <td className={styles.tableData}>{row.CustomerName}</td>
                      {/* Address wale td ko ek extra class dein */}
                      <td
                        className={`${styles.tableData} ${styles.addressCell}`}
                      >
                        {row.Address}
                      </td>
                      <td className={styles.tableData}>{row.Area}</td>
                      <td className={styles.tableData}>{row.ContactNo}</td>
                      <td className={styles.tableData}>
                        <div className={styles.productTable}>
                          {(() => {
                            const types = row.ProductTypes
                              ? row.ProductTypes.split(",")
                              : [];
                            const weights = row.Weights
                              ? row.Weights.split(",")
                              : [];
                            const quantities = row.Quantities
                              ? row.Quantities.split(",")
                              : [];
                            const rates = row.Rates ? row.Rates.split(",") : [];

                            return types.map((type, i) => (
                              <div key={i} className={styles.productRow}>
                                <span className={styles.pType}>
                                  {type?.trim() || "-"}
                                </span>
                                <span className={styles.pWeight}>
                                  {weights[i]?.trim() || "-"}
                                </span>
                                <span className={styles.pQty}>
                                  Qty: {quantities[i]?.trim() || "-"}
                                </span>
                                <span className={styles.pRate}>
                                  ₹{rates[i]?.trim() || "-"}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                      </td>
                      <td className={styles.tableData}>{row.DeliveryCharge}</td>
                      <td className={styles.tableData}>
                        {new Date(row.OrderDate)
                          .toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                          })
                          .replace(",", "")
                          .replace(" ", "-")}
                      </td>
                      <td className={styles.tableData}>
                        {new Date(row.DeliveryDate)
                          .toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                          })
                          .replace(",", "")
                          .replace(" ", "-")}
                      </td>
                      <td className={styles.tableData}>
                        {row.DeliveryManName}
                      </td>
                      <td className={styles.tableData}>
                        <span
                          className={`${styles.statusBadge} ${getStatusClass(
                            row.OrderStatus,
                          )}`}
                        >
                          {row.OrderStatus || "N/A"}
                        </span>
                      </td>
                      <td>
                        <span className={styles.paymentModeBadge}>
                          {formatPaymentSummary(row.PaymentSummary)}
                        </span>
                      </td>
                      <td className={styles.tableData}>{row.OrderTakenBy}</td>
                      <td className={styles.tableData}>{row.Remark}</td>
                      <td>
                        <select
                          value={row.PaymentVerifyStatus || "Pending"}
                          disabled={
                            row.PaymentVerifyStatus === "Verified" ||
                            !row.PaymentID ||
                            isFilterLoading
                          }
                          onChange={(e) =>
                            handleStatusChange(row, e.target.value)
                          }
                          className={styles.paymentDropdown}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Verified">Verified</option>
                          <option value="Incomplete">Incomplete</option>
                        </select>

                        {row.ShortAmount > 0 && (
                          <p className={styles.shortDue}>
                            Due: ₹{row.ShortAmount}
                          </p>
                        )}
                      </td>
                      <td className={styles.actions}>
                        <button
                          className={styles.actionBtn}
                          title="View Details"
                          disabled={isFilterLoading}
                        >
                          <FaEye />
                        </button>
                        <button
                          className={styles.actionBtn}
                          title="Edit Product"
                          disabled={isFilterLoading}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className={styles.actionBtn}
                          title="Generate Invoice"
                          onClick={() => handleGenerateInvoice(row)}
                          disabled={isFilterLoading}
                        >
                          <FaFileInvoiceDollar />
                        </button>
                      </td>
                      <td className={styles.tableData}>
                        {row.VerifyMark || "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  !loading &&
                  !isFilterLoading && (
                    <tr>
                      <td colSpan="19" className={styles.noData}>
                        <div className={styles.noDataContent}>
                          <PiEggBold className={styles.noDataIcon} />
                          <h4>No products found</h4>
                          <p>
                            Try adjusting your search filters or add a new
                            product.
                          </p>
                          <button
                            className={styles.addBtn}
                            onClick={() => setIsModalOpen(true)}
                          >
                            <FaPlus className={styles.btnIcon} />
                            Add First Product
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {filteredData.length > 0 && !isFilterLoading && (
            <div className={styles.pagination}>
              <button
                className={styles.paginationBtn}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </button>

              <div className={styles.paginationPages}>
                {Array.from({ length: totalPages }, (_, i) => (
                  <span
                    key={i}
                    className={
                      currentPage === i + 1 ? styles.paginationActive : ""
                    }
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>

              <button
                className={styles.paginationBtn}
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <AddOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddOrder={handleAddOrder}
      />

      <AddCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onAddCustomer={handleAddCustomer}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setReceivedAmount("");
          setVerificationRemarks("");
        }}
        selectedPayment={selectedPayment}
        receivedAmount={receivedAmount}
        setReceivedAmount={setReceivedAmount}
        verificationRemarks={verificationRemarks}
        setVerificationRemarks={setVerificationRemarks}
        onVerifyPayment={handleVerifyPayment}
      />

      {isInvoiceModalOpen && (
        <InvoiceGenerator
          orderData={selectedOrderForInvoice}
          onClose={closeInvoiceModal}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
