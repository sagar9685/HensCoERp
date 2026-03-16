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
  FaTruck,
} from "react-icons/fa";
import { PiEggBold } from "react-icons/pi";
import AddOrderModal from "./AdminOrderModal/AddOrderModal";
import AddCustomerModal from "./AddCustomerModal";
import { useDispatch, useSelector } from "react-redux";
import { verifyPayment } from "../features/paymentVerifySlice";
import { toast } from "react-toastify";
import { fetchOrder } from "../features/orderSlice";
import PaymentModal from "./PaymentModal";
import Loader from "./Loader";
import InvoiceGenerator from "./OrderInvoice";
import ChalanGenerator from "./Chalan";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import * as XLSX from "xlsx";
import EditOrderModal from "./AdminOrderModal/EditOrderModal";
import { fetchProductTypes } from "../features/productTypeSlice";
import ViewOrderModal from "./ViewOrderModal";

const AdminDashboard = () => {
  const today = new Date().toISOString().split("T")[0];

  const [filters, setFilters] = useState(() => {
    const savedFilters = localStorage.getItem("adminFilters");
    return savedFilters
      ? JSON.parse(savedFilters)
      : {
          fromDate: today,
          toDate: today,
          orderStatus: "",
          paymentStatus: "",
          ProductId: "",
          customer: "",
          deliveryMan: "",
          ProductName: "",
          ProductType: "",
        };
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const dispatch = useDispatch();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [verificationRemarks, setVerificationRemarks] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [isFilterLoading, setIsFilterLoading] = useState(false);

  const orders = useSelector((state) => state.order.record);
  const loading = useSelector((state) => state.order.loading);

  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const [selectedOrderForChalan, setSelectedOrderForChalan] = useState(null);
  const [isChalanModalOpen, setIsChalanModalOpen] = useState(false);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedViewOrder, setSelectedViewOrder] = useState(null);

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

  const productTypes = useSelector((state) => state.product.types);
  console.log(productTypes, "console.log(productTypes);");

  const filteredProductNames = productTypes.filter(
    (p) => p.Category === filters.ProductType,
  );

  const uniqueCategories = [
    ...new Set(productTypes?.map((item) => item.Category)),
  ];

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

  const handleEditOrder = (order) => {
    const status = (order.OrderStatus || "").toLowerCase();

    const blockedStatus = ["complete", "completed", "cancel", "cancelled"];

    if (blockedStatus.includes(status)) {
      toast.error(`Order is ${status}. Editing not allowed.`);
      return;
    }

    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    dispatch(fetchOrder());
  }, [dispatch]);

  useEffect(() => {
    localStorage.setItem("adminFilters", JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    if (!orders || orders.length === 0) return;

    let filtered = [...orders];

    // Apply date filter from saved filters
    if (filters.fromDate || filters.toDate) {
      filtered = filtered.filter((item) =>
        isDateInRange(item.OrderDate, filters.fromDate, filters.toDate),
      );
    }

    setFilteredData(filtered);
  }, [orders]);

  useEffect(() => {
    dispatch(fetchOrder());
    dispatch(fetchProductTypes());
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "ProductType") {
      setFilters({
        ...filters,
        ProductType: value,
        ProductName: "", // reset product name
      });
    } else {
      setFilters({
        ...filters,
        [name]: value,
      });
    }
  };

  const handleGenerateChalan = (orderRow) => {
    setSelectedOrderForChalan(orderRow);
    setIsChalanModalOpen(true);
  };

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

  const deliveryMenList = [
    ...new Set(
      orders
        ?.map((o) => o.DeliveryManName)
        .filter((name) => name && name.trim() !== ""),
    ),
  ];

  const handleClear = () => {
    const resetFilters = {
      ProductId: "",
      ProductName: "",
      ProductType: "",
      customer: "",
      deliveryMan: "",
      fromDate: today,
      toDate: today,
      orderStatus: "",
      paymentStatus: "",
    };

    setFilters(resetFilters);
    localStorage.removeItem("adminFilters"); // 🔥 important
    setCurrentPage(1);
  };

  const handleSearch = () => {
    let filtered = [...orders];

    if (filters.fromDate || filters.toDate) {
      filtered = filtered.filter((item) =>
        isDateInRange(item.OrderDate, filters.fromDate, filters.toDate),
      );
    }

    if (filters.orderStatus) {
      filtered = filtered.filter(
        (item) =>
          (item.OrderStatus || "").toLowerCase() ===
          filters.orderStatus.toLowerCase(),
      );
    }

    if (filters.paymentStatus) {
      filtered = filtered.filter(
        (item) =>
          (item.PaymentVerifyStatus || "Pending") === filters.paymentStatus,
      );
    }

    if (filters.ProductId) {
      filtered = filtered.filter((item) =>
        item.OrderID?.toString().includes(filters.ProductId),
      );
    }

    if (filters.customer) {
      const search = filters.customer.toLowerCase().trim();

      filtered = filtered.filter((item) => {
        const name = item.CustomerName?.toLowerCase() || "";
        const phone = item.ContactNo?.toString() || "";

        return name.includes(search) || phone.includes(search);
      });
    }

    if (filters.deliveryMan) {
      filtered = filtered.filter((item) =>
        item.DeliveryManName?.toLowerCase().includes(
          filters.deliveryMan.toLowerCase(),
        ),
      );
    }

    if (filters.ProductType) {
      filtered = filtered.filter((item) => {
        const names = item.ProductNames?.split(",") || [];
        return names.some((n) =>
          n.trim().toLowerCase().includes(filters.ProductType.toLowerCase()),
        );
      });
    }

    if (filters.ProductName) {
      filtered = filtered.filter((item) => {
        const types = item.ProductTypes?.split(",") || [];
        return types.some(
          (t) => t.trim().toLowerCase() === filters.ProductName.toLowerCase(),
        );
      });
    }
    setFilteredData(filtered);
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

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      toast.error("No data available to export");
      return;
    }

    const exportData = [];
    let slNo = 1;

    filteredData.forEach((order) => {
      const productNames = (order.ProductNames || "").split(",");
      const productTypes = (order.ProductTypes || "").split(",");
      const weights = (order.Weights || "").split(",");
      const quantities = (order.Quantities || "").split(",");
      const rates = (order.Rates || "").split(",");
      const deliveryCharge = Number(order.DeliveryCharge) || 0;

      // Payment Summary parsing
      const payments = {};
      if (order.PaymentSummary) {
        order.PaymentSummary.split("|").forEach((item) => {
          const [mode, amt] = item.split(":");
          if (mode && amt) {
            payments[mode.trim().toUpperCase()] = parseFloat(amt.trim()) || 0;
          }
        });
      }

      // 1. Pehle pure order ka subtotal calculate karein (Final Total ke liye)
      const orderSubtotal = quantities.reduce((acc, qty, idx) => {
        return acc + Number(qty) * Number(rates[idx] || 0);
      }, 0);

      // 2. Har product row generate karein
      productNames.forEach((name, index) => {
        const qty = Number(quantities[index]) || 0;
        const rate = Number(rates[index]) || 0;
        const productTotal = qty * rate;

        const row = {
          "Sl No": index === 0 ? slNo : "",

          "Product Name": name.trim(),
          "Customer Name": order.CustomerName,
          Address: order.Address,
          Area: order.Area,
          "Contact No": order.ContactNo,
          "Product Type": productTypes[index]?.trim() || "-",
          "Default Weight": weights[index]?.trim() || "-",
          Qty: qty,
          Rate: rate,
          "Product Total": productTotal,
          "Delivery Charge": index === 0 ? deliveryCharge : 0,
          // --- Ye raha aapka maanga hua column ---
          "Final Payable (Total + Delivery)":
            index === 0 ? orderSubtotal + deliveryCharge : "",
          "Order Date": order.OrderDate?.split("T")[0],
          "Delivery Date": order.DeliveryDate?.split("T")[0],
          "Delivery Man": order.DeliveryManName || "-",
          "Order Status": order.OrderStatus || "Pending",
          "Order Taken By": order.OrderTakenBy || "-",

          // Payment Amounts
          Cash: payments["CASH"] || 0,
          GPay: payments["GPAY"] || 0,
          Paytm: payments["PAYTM"] || 0,
          FOC: payments["FOC"] || 0,
          "Bank Transfer": payments["BANK TRANSFER"] || payments["BANK"] || 0,
        };

        exportData.push(row);
      });
      slNo++;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Professional Column Widths
    const wscols = [
      { wch: 6 },
      { wch: 10 },
      { wch: 20 },
      { wch: 25 },
      { wch: 35 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 8 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 15 },
    ];
    worksheet["!cols"] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Order_Report");

    const fileName = `HensCo_Sales_${filters.fromDate}_to_${filters.toDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

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
        <div className={styles.filterGrid}>
          {/* FROM DATE */}
          <div className={styles.inputGroup}>
            <label>FROM DATE</label>
            <input
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleChange}
            />
          </div>

          {/* TO DATE */}
          <div className={styles.inputGroup}>
            <label>TO DATE</label>
            <input
              type="date"
              name="toDate"
              value={filters.toDate}
              onChange={handleChange}
            />
          </div>

          {/* ORDER STATUS */}
          <div className={styles.inputGroup}>
            <label>ORDER STATUS</label>
            <select
              name="orderStatus"
              value={filters.orderStatus}
              onChange={handleChange}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="complete">Complete</option>
              <option value="cancel">Cancel</option>
            </select>
          </div>

          {/* PAYMENT STATUS */}
          <div className={styles.inputGroup}>
            <label>PAYMENT STATUS</label>
            <select
              name="paymentStatus"
              value={filters.paymentStatus}
              onChange={handleChange}
            >
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Verified">Verified</option>
              <option value="Incomplete">Incomplete</option>
            </select>
          </div>

          {/* PRODUCT ID */}
          <div className={styles.inputGroup}>
            <label>PRODUCT ID</label>
            <input
              type="text"
              name="ProductId"
              value={filters.ProductId}
              onChange={handleChange}
              placeholder="Search Product ID"
            />
          </div>

          {/* CUSTOMER */}
          <div className={styles.inputGroup}>
            <label>CUSTOMER</label>
            <input
              type="text"
              name="customer"
              value={filters.customer}
              onChange={handleChange}
              placeholder="Customer name or phone"
            />
          </div>

          {/* DELIVERY MAN */}
          <div className={styles.inputGroup}>
            <label>DELIVERY MAN</label>
            <select
              name="deliveryMan"
              value={filters.deliveryMan}
              onChange={handleChange}
            >
              <option value="">All</option>

              {deliveryMenList.map((man, index) => (
                <option key={index} value={man}>
                  {man}
                </option>
              ))}
            </select>
          </div>

          {/* PRODUCT TYPE */}
          <div className={styles.inputGroup}>
            <label>PRODUCT TYPE</label>

            <select
              name="ProductType"
              value={filters.ProductType}
              onChange={handleChange}
            >
              <option value="">All</option>

              {uniqueCategories.map((cat, index) => (
                <option key={index} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          {/* PRODUCT NAME */}
          <div className={styles.inputGroup}>
            <label>PRODUCT NAME</label>

            <select
              name="ProductName"
              value={filters.ProductName}
              onChange={handleChange}
              disabled={!filters.ProductType}
            >
              <option value="">All</option>

              {filteredProductNames.map((p) => (
                <option key={p.ProductTypeId} value={p.ProductType}>
                  {p.ProductType}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className={styles.actionButtons}>
          <button className={styles.searchBtn} onClick={handleSearch}>
            Search
          </button>

          <button className={styles.clearBtn} onClick={handleClear}>
            Clear Filters
          </button>
        </div>
        {/* ACTIVE FILTERS DISPLAY */}
        {(filters.orderStatus ||
          filters.ProductType ||
          filters.ProductName ||
          filters.deliveryMan ||
          filters.fromDate !== today ||
          filters.toDate !== today ||
          Object.keys(filters).some(
            (key) =>
              ![
                "fromDate",
                "toDate",
                "orderStatus",
                "ProductType",
                "ProductName",
                "deliveryMan",
                "paymentStatus",
              ].includes(key) && filters[key],
          )) && (
          <div className={styles.activeFilters}>
            <span className={styles.activeFiltersLabel}>Active Filters:</span>

            {/* Show Date Tags only if they aren't 'today' */}
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

            {/* Map through all other active dropdown/text filters */}
            {Object.keys(filters)
              .filter(
                (key) => key !== "fromDate" && key !== "toDate" && filters[key],
              )
              .map((key) => (
                <span key={key} className={styles.filterTag}>
                  {key.replace(/([A-Z])/g, " $1")}: {filters[key]}
                  <button
                    onClick={() => {
                      // Special case: clearing ProductType should clear ProductName too
                      if (key === "ProductType") {
                        setFilters({
                          ...filters,
                          ProductType: "",
                          ProductName: "",
                        });
                      } else {
                        setFilters({ ...filters, [key]: "" });
                      }
                    }}
                  >
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
                          onClick={() => {
                            setSelectedViewOrder(row);
                            setIsViewModalOpen(true);
                          }}
                        >
                          <FaEye />
                        </button>
                        <button
                          className={styles.actionBtn}
                          title="Edit Product"
                          onClick={() => {
                            console.log("Edit clicked", row);
                            handleEditOrder(row);
                          }}
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
                        <button
                          className={styles.actionBtn}
                          title="Generate Chalan"
                          onClick={() => handleGenerateChalan(row)}
                          disabled={isFilterLoading}
                          style={{ color: "#d35400" }} // Optional: Chalan ke liye alag color
                        >
                          <FaTruck />
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

      {isChalanModalOpen && (
        <ChalanGenerator
          orderData={selectedOrderForChalan}
          onClose={() => setIsChalanModalOpen(false)}
        />
      )}

      {isEditModalOpen && (
        <EditOrderModal
          order={selectedOrder}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      <ViewOrderModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        order={selectedViewOrder}
      />
    </div>
  );
};

export default AdminDashboard;
