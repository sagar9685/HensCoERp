import UserFooter from "./UserFooter";
import UserNavbar from "./UserNavBar";
import UserSideBar from "./UserSidebar";
import styles from "./UserForm.module.css";
import { useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { fetchOrder } from "../../features/orderSlice";
import AssignOrderModal from "./AssignOrderModal";
import UserCompleteOrderModal from "./UserCompleteOrderModal";
import {
  assignOrder,
  fetchAssignOrder,
  updateAssignedOrder,
  updateDeliveryStatus,
  cancelAssignedOrder,
} from "../../features/assignedOrderSlice";
import { toast } from "react-toastify";
import ExcelExport from "../ExcelExport";
import { useOrderFilter } from "./UserOrderFilter";
import CancelOrderModal from "./CancelOrderModal";
import UpdateQuantityModal from "./UpdateQuantityModal";
import RTVModal from "./RTVModal";
import InvoiceGenerator from "../OrderInvoice";

const UserForm = () => {
  const dispatch = useDispatch();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [isCompleteModalOpen, setCompleteModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedItemForUpdate, setSelectedItemForUpdate] = useState(null);

  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  const [rtvOpen, setRtvOpen] = useState(false);
  const [rtvRow, setRtvRow] = useState(null);

  const authData = JSON.parse(localStorage.getItem("authData"));
  const username = authData?.name;

  const handleRTVClick = (row) => {
    if (row.DeliveryStatus === "RTV" || row.OrderStatus === "RTV") {
      toast.info("RTV already done");
      return;
    }

    setRtvRow(row);
    setRtvOpen(true);
  };

//  use the custom hook for filter and pagination

  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    areaFilter,
    setAreaFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    deliveryManFilter,
    setDeliveryManFilter,
    sortConfig,
    currentPage,
    currentItems,
    totalPages,
    assignedOrders,
    handleSort,
    paginate,
    nextPage,
    prevPage,
    getPageNumbers,
    formatPaymentSummary,
    indexOfFirstItem,
    indexOfLastItem,
    filteredAndSortedOrders,
    assignFilter,
    setAssignFilter,
  } = useOrderFilter();

  useEffect(() => {
    dispatch(fetchOrder());
    dispatch(fetchAssignOrder());
  }, [dispatch]);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchOrder()).then((res) => {
        res.payload.forEach((order) => {
          const items = order.ProductTypes?.split(",") || [];
          const quantities = order.Quantities?.split(",") || [];

          items.forEach((item, i) => {
            if (Number(quantities[i]) === 0) {
              toast.warn(
                `Item "${item.trim()}" in Order #${order.OrderID} is out of stock!`,
              );
            }
          });
        });
      });
    }, 60000); // har 60 second me check

    return () => clearInterval(interval);
  }, [dispatch]);

  //   const handleStatusChange = (row, newStatus) => {
  //   if (newStatus === "Cancel") {
  //     setCancelOrder(row);
  //     setCancelModalOpen(true); // ❗ cancel modal open
  //     return;
  //   }

  //   if (newStatus === "Complete") {
  //     setConfirmOrder(row);
  //     setCompleteModalOpen(true); // already hai
  //     return;
  //   }

  //   dispatch(updateDeliveryStatus({
  //     assignId: row.AssignID,
  //     status: newStatus,
  //   }));
  // };

  // UserForm.js ke handleStatusChange mein:

  const handleStatusChange = async (row, newStatus) => {
    if (newStatus === "Cancel") {
      setCancelOrder(row);
      setCancelModalOpen(true);
      return;
    }

    if (newStatus === "Complete") {
      setConfirmOrder(row);
      setCompleteModalOpen(true);
      return;
    }

    try {
      // unwrap() use karne se UI wait karega jab tak Redux state update na ho jaye
      await dispatch(
        updateDeliveryStatus({
          assignId: row.AssignID,
          status: newStatus,
          username,
        }),
      ).unwrap();

      toast.success(`Status updated to ${newStatus}`);

      // AGAR ABHI BHI INSTANT UPDATE NA HO, toh neeche wali line uncomment karein:
      // dispatch(fetchAssignOrder());
    } catch (err) {
      toast.error("Failed to update status", err);
    }
  };

  const handleRTVSubmit = async (reason) => {
    try {
      await dispatch(
        updateDeliveryStatus({
          assignId: rtvRow.AssignID,
          status: "RTV",
          username,
          reason,
        }),
      ).unwrap();

      toast.success("RTV processed successfully");

      // close modal
      setRtvOpen(false);
      setRtvRow(null);

      // 🔥 IMPORTANT: refresh data
      dispatch(fetchAssignOrder());
    } catch (err) {
      console.error("RTV Error:", err);
      toast.error("RTV failed. Please try again.");
    }
  };

  const handleCancelSubmit = async (reason) => {
    try {
      // unwrap() use karne se humein pakka pata chalta hai ki API success hui
      await dispatch(
        cancelAssignedOrder({
          assignId: cancelOrder.AssignID,
          reason,
          username,
        }),
      ).unwrap();

      toast.success("Order cancelled successfully");

      // UI sync ke liye optionally refresh bhi kar sakte hain (par slice update kafi hai)
      // dispatch(fetchAssignOrder());

      setCancelModalOpen(false);
      setCancelOrder(null);
    } catch (err) {
      console.error("Cancel API Error:", err);
      toast.error("Database update failed. Please try again.");
    }
  };

  const handleInvoiceClick = (row) => {
    console.log("Invoice row data:", row); // 👈 yaha add karo
    setInvoiceOrder(row);
    setIsInvoiceOpen(true);
  };
  // Handle Complete Order from Modal
  // UserForm.js mein handleCompleteOrder function:

  const handleCompleteOrder = async () => {
    try {
      // 1. Dispatch action and wait for it to finish in Redux
      await dispatch(
        updateDeliveryStatus({
          assignId: confirmOrder.AssignID,
          status: "Complete",
          username,
        }),
      ).unwrap();

      toast.success("Order completed successfully");

      // 2. Modal band karein
      setCompleteModalOpen(false);
      setConfirmOrder(null);

      // 3. AGAR abhi bhi update nahi dikh raha, toh niche wali line ko uncomment karein:
      // dispatch(fetchAssignOrder());
    } catch (err) {
      console.error("Complete Order Error:", err);
      toast.error("Failed to update status");
    }
  };
  // const handleAssignSubmit = async (payload) => {
  //   try {
  //     // Note: Check if your table row data uses 'AssignID' (uppercase/lowercase)
  //     const assignmentId = selectedOrder?.AssignID;

  //     if (assignmentId) {
  //       console.log("Action: Reassigning Order ID", assignmentId);
  //       await dispatch(
  //         updateAssignedOrder({
  //           assignmentId: assignmentId,
  //           ...payload,
  //         }),
  //       ).unwrap();
  //       toast.success("Order reassigned successfully");
  //     } else {
  //       console.log("Action: First time assignment");
  //       await dispatch(assignOrder(payload)).unwrap();
  //       toast.success("Order assigned successfully");
  //     }

  //     dispatch(fetchAssignOrder());
  //     handleCloseModal();
  //   } catch (err) {
  //     console.error("UI ERROR:", err);
  //     toast.error(err.message || "Failed to process assignment");
  //   }
  // };

  // const handleAssignSubmit = async (payload) => {
  //   try {
  //     // Agar row mein pehle se AssignID hai, toh update route hit karo
  //     if (selectedOrder?.AssignID) {
  //       await dispatch(
  //         updateAssignedOrder({
  //           assignmentId: selectedOrder.AssignID,
  //           ...payload,
  //           username,
  //         }),
  //       ).unwrap();
  //     } else {
  //       await dispatch(
  //         assignOrder({
  //           ...payload,
  //           username,
  //         }),
  //       ).unwrap();
  //     }
  //     dispatch(fetchAssignOrder());
  //     handleCloseModal();
  //   } catch (err) {
  //     toast.error(err.message);
  //   }
  // };

  const handleAssignSubmit = async (payload) => {
    try {
      if (selectedOrder?.AssignID) {
        // REASSIGN CASE
        await dispatch(
          updateAssignedOrder({
            assignmentId: selectedOrder.AssignID,
            ...payload,
            username,
          }),
        ).unwrap();
        toast.success("Order reassigned successfully");
      } else {
        // ASSIGN CASE
        await dispatch(
          assignOrder({
            ...payload,
            username,
          }),
        ).unwrap();
        toast.success("Order assigned successfully");
      }

      dispatch(fetchAssignOrder());
      handleCloseModal(); // Success hone par hi band hoga
    } catch (err) {
      // Yahan 'err' wahi message hai jo backend se aa raha hai (e.g. "Tikka out of stock")
      console.error("Assignment Failed:", err);
      toast.error(err || "Failed to process assignment");
      // Modal band nahi hoga, user ko error dikhega
    }
  };

  const handleEditClick = (row) => {
    console.log("Full row:", row);
    console.log("ItemIDs:", row.ItemIDs);
    console.log("Quantities:", row.Quantities);

    setSelectedItemForUpdate(row);
    setIsUpdateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleCloseCompleteModal = () => {
    setCompleteModalOpen(false);
    setConfirmOrder(null);
  };

  return (
    <>
      <div className="container-scroller">
        <UserSideBar />
        <div className="container-fluid page-body-wrapper">
          <UserNavbar />
          {/* Header Section ke turant baad ye add karein */}

          <div className="main-panel">
            <div className="content-wrapper">
              <div className="page-header">
                <h3 className="page-title">Order Management</h3>
                <nav aria-label="breadcrumb">
                  <ol className="breadcrumb">
                    <li className="breadcrumb-item">
                      <a href="#">Dashboard</a>
                    </li>
                    <li className="breadcrumb-item active" aria-current="page">
                      All Orders
                    </li>
                  </ol>
                </nav>
              </div>
              <div className={styles.statsRow}>
                <div className={styles.statCard}>
                  <div
                    className={styles.statIcon}
                    style={{ background: "#e3f2fd", color: "#1976d2" }}
                  >
                    <i className="mdi mdi-package-variant"></i>
                  </div>
                  <div className={styles.statDetail}>
                    <p>Total Orders</p>
                    <h4>{filteredAndSortedOrders.length}</h4>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div
                    className={styles.statIcon}
                    style={{ background: "#e8f5e9", color: "#2e7d32" }}
                  >
                    <i className="mdi mdi-check-circle"></i>
                  </div>
                  <div className={styles.statDetail}>
                    <p>Complete</p>
                    <h4>
                      {
                        filteredAndSortedOrders.filter(
                          (o) => o.OrderStatus === "Complete",
                        ).length
                      }
                    </h4>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div
                    className={styles.statIcon}
                    style={{ background: "#fff3e0", color: "#ef6c00" }}
                  >
                    <i className="mdi mdi-clock-outline"></i>
                  </div>
                  <div className={styles.statDetail}>
                    <p>Pending</p>
                    <h4>
                      {
                        filteredAndSortedOrders.filter(
                          (o) =>
                            o.OrderStatus === "Pending" ||
                            o.OrderStatus === "In Progress",
                        ).length
                      }
                    </h4>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div
                    className={styles.statIcon}
                    style={{ background: "#ffebee", color: "#c62828" }}
                  >
                    <i className="mdi mdi-close-circle"></i>
                  </div>
                  <div className={styles.statDetail}>
                    <p>Cancelled</p>
                    <h4>
                      {
                        filteredAndSortedOrders.filter(
                          (o) => o.OrderStatus === "Cancel",
                        ).length
                      }
                    </h4>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-12 grid-margin">
                  <div className="card">
                    <div className="card-body">
                      {/* Header Section */}
                      {/* Header Actions Section Update */}
                      <div className={styles.headerActions}>
                        <div className={styles.filterControls}>
                          {/* Search Box */}
                          <div className={styles.searchBox}>
                            <i className="mdi mdi-magnify"></i>
                            <input
                              type="text"
                              placeholder="Search..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>

                          {/* Date Range Group - Wrapping in a div helps layout */}
                          <div className={styles.dateGroup}>
                            <label>From:</label>
                            <input
                              type="date"
                              value={fromDate}
                              onChange={(e) => setFromDate(e.target.value)}
                              className={styles.dateInput}
                            />
                            <label>To:</label>
                            <input
                              type="date"
                              value={toDate}
                              onChange={(e) => setToDate(e.target.value)}
                              className={styles.dateInput}
                            />
                          </div>

                          {/* Dropdowns */}
                          <select
                            className={styles.statusFilter}
                            value={areaFilter}
                            onChange={(e) => setAreaFilter(e.target.value)}
                          >
                            <option value="all">All Areas</option>
                            {[...new Set(assignedOrders?.map((i) => i.Area))]
                              .filter(Boolean)
                              .sort()
                              .map((a) => (
                                <option key={a} value={a}>
                                  {a}
                                </option>
                              ))}
                          </select>

                          <select
                            className={styles.statusFilter}
                            value={deliveryManFilter}
                            onChange={(e) =>
                              setDeliveryManFilter(e.target.value)
                            }
                          >
                            <option value="all">All Delivery Boys</option>
                            {[
                              ...new Set(
                                assignedOrders
                                  ?.filter((o) => o.DeliveryManName)
                                  .map((o) => o.DeliveryManName),
                              ),
                            ]
                              .sort()
                              .map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                          </select>

                          <select
                            className={styles.statusFilter}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                          >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="complete">Completed</option>
                            <option value="cancel">Cancel</option>
                          </select>

                          <select
                            className={styles.statusFilter}
                            value={assignFilter}
                            onChange={(e) => setAssignFilter(e.target.value)}
                          >
                            <option value="all">All Assign</option>
                            <option value="assigned">Assigned</option>
                            <option value="unassigned">Unassigned</option>
                          </select>

                          {/* Reset Button (Highly Recommended) */}
                          <button
                            className="btn btn-light btn-sm"
                            onClick={() => {
                              setFromDate("");
                              setToDate("");
                              setSearchTerm("");
                              setAreaFilter("all");
                              setStatusFilter("all");
                              setDeliveryManFilter("all");
                              setAssignFilter("all");
                            }}
                          >
                            Clear
                          </button>
                        </div>

                        <ExcelExport
                          data={filteredAndSortedOrders}
                          fileName="Orders.xlsx"
                        >
                          <button className="btn btn-success">
                            <i className="mdi mdi-download"></i> Export
                          </button>
                        </ExcelExport>
                      </div>

                      {/* Table Section */}
                      <div className={styles.tableContainer}>
                        <div className={styles.tableWrapper}>
                          <table className={styles.dataTable}>
                            <thead>
                              <tr>
                                <th onClick={() => handleSort("CustomerName")}>
                                  Customer{" "}
                                  {sortConfig.key === "CustomerName" && (
                                    <i
                                      className={`mdi mdi-chevron-${
                                        sortConfig.direction === "asc"
                                          ? "up"
                                          : "down"
                                      }`}
                                    ></i>
                                  )}
                                </th>
                                <th>Contact</th>
                                <th>Area</th>
                                <th>Type</th>
                                <th>Weight</th>
                                <th>Qty</th>
                                <th>Amount</th>
                                <th onClick={() => handleSort("OrderDate")}>
                                  Order Date{" "}
                                  {sortConfig.key === "OrderDate" && (
                                    <i
                                      className={`mdi mdi-chevron-${
                                        sortConfig.direction === "asc"
                                          ? "up"
                                          : "down"
                                      }`}
                                    ></i>
                                  )}
                                </th>
                                <th>Delivery Date</th>
                                <th>Payment Recive Date</th>
                                <th>Delivery Man</th>
                                <th>Remark</th>
                                <th>Delivery Status</th>
                                <th>Assign Status</th>
                                <th>Payment Mode</th>
                                <th>RTV</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentItems.length > 0 ? (
                                currentItems.map((row) => (
                                  <OrderTableRow
                                    key={row.OrderID}
                                    row={row}
                                    onStatusChange={handleStatusChange}
                                    onAssignClick={() => {
                                      setSelectedOrder(row);
                                      setIsModalOpen(true);
                                    }}
                                    onEditClick={handleEditClick}
                                    formatPaymentSummary={formatPaymentSummary}
                                    onRTVClick={handleRTVClick}
                                    onInvoiceClick={handleInvoiceClick}
                                  />
                                ))
                              ) : (
                                <tr>
                                  <td
                                    colSpan="15"
                                    className={styles.emptyState}
                                  >
                                    <div className={styles.emptyContent}>
                                      <i className="mdi mdi-package-variant"></i>
                                      <h4>No orders found</h4>
                                      <p>
                                        Try adjusting your search or filter to
                                        find what you're looking for.
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Footer Section */}
                      <TableFooter
                        indexOfFirstItem={indexOfFirstItem}
                        indexOfLastItem={indexOfLastItem}
                        totalItems={filteredAndSortedOrders.length}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPrevPage={prevPage}
                        onNextPage={nextPage}
                        onPaginate={paginate}
                        getPageNumbers={getPageNumbers}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <UserFooter />
          </div>
        </div>
      </div>

      {/* Modals */}
      <AssignOrderModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleAssignSubmit}
        order={selectedOrder}
      />

      <UserCompleteOrderModal
        isOpen={isCompleteModalOpen}
        onClose={handleCloseCompleteModal}
        onSubmit={handleCompleteOrder}
        order={confirmOrder}
      />

      <CancelOrderModal
        isOpen={cancelModalOpen}
        order={cancelOrder}
        onClose={() => setCancelModalOpen(false)}
        onSubmit={handleCancelSubmit}
      />

      <UpdateQuantityModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        row={selectedItemForUpdate}
      />

      <RTVModal
        isOpen={rtvOpen}
        onClose={() => setRtvOpen(false)}
        row={rtvRow}
        username={username}
        onSubmit={handleRTVSubmit}
      />

      {isInvoiceOpen && (
        <InvoiceGenerator
          orderData={invoiceOrder}
          onClose={() => setIsInvoiceOpen(false)}
        />
      )}
    </>
  );
};

// Separate component for table row
const OrderTableRow = ({
  row,
  onStatusChange,
  onAssignClick,
  onEditClick,
  formatPaymentSummary,
  onRTVClick,
  onInvoiceClick,
}) => {
  // ✅ 1. ROW LOCK LOGIC:
  // Agar OrderStatus ya DeliveryStatus processed state mein hai, toh row lock hogi.
  const isLocked =
    row.OrderStatus === "Complete" ||
    row.OrderStatus === "Cancel" ||
    row.OrderStatus === "RTV" ||
    row.DeliveryStatus === "RTV";

  // ✅ 2. DYNAMIC BADGE COLOR LOGIC:
  const getStatusBadgeClass = () => {
    if (row.OrderStatus === "RTV" || row.DeliveryStatus === "RTV")
      return styles.cancelledBadge; // Red/Orange for RTV
    if (row.OrderStatus === "Complete") return styles.completedBadge; // Green
    if (row.OrderStatus === "Cancel") return styles.cancelledBadge; // Red
    return "";
  };

  return (
    <tr
      key={row.OrderID}
      className={row.OrderStatus === "Complete" ? styles.completedRow : ""}
    >
      <td>
        <div className={styles.customerInfo}>
          <strong>{row.CustomerName}</strong>
          <span>{row.Address}</span>
        </div>
      </td>
      <td className={styles.contactCell}>
        <a href={`tel:${row.ContactNo}`} className={styles.contactLink}>
          {row.ContactNo}
        </a>
      </td>
      <td className={styles.areaCell}>{row.Area}</td>

      {/* Items Breakdown */}
      <td className={styles.typeCell}>
        {row.ProductTypes?.split(",").map((item, i) => (
          <div key={i} className={styles.lineItem}>
            {item.trim()}
          </div>
        ))}
      </td>
      <td className={styles.weightCell}>
        {row.Weights?.split(",").map((item, i) => (
          <div key={i} className={styles.lineItem}>
            {item.trim()}
          </div>
        ))}
      </td>
      <td className={styles.quantityCell}>
        {row.Quantities?.split(",").map((item, i) => (
          <div key={i} className={styles.lineItem}>
            {item.trim()}
          </div>
        ))}
      </td>

      <td className={styles.amountCell}>
        <div className={styles.amountInfo}>
          <div>Rate: ₹{row.Rates}</div>
          <div>Delivery: ₹{row.DeliveryCharge}</div>
          <strong>
            Total: ₹{Number(row.GrandItemTotal) + Number(row.DeliveryCharge)}
          </strong>
        </div>
      </td>

      {/* Dates */}
      <td className={styles.dateCell}>
        {row.OrderDate
          ? new Date(row.OrderDate)
              .toLocaleDateString("en-GB")
              .replace(/\//g, "-")
          : "-"}
      </td>
      <td className={styles.dateCell}>
        {row.DeliveryDate
          ? new Date(row.DeliveryDate)
              .toLocaleDateString("en-GB")
              .replace(/\//g, "-")
          : "-"}
      </td>
      <td className={styles.dateCell}>
        {row.PaymentReceivedDate
          ? new Date(row.PaymentReceivedDate)
              .toLocaleDateString("en-GB")
              .replace(/\//g, "-")
          : "-"}
      </td>

      <td className={styles.deliveryCell}>
        {row.DeliveryManName ? (
          <div className={styles.deliveryMan}>
            <div className={styles.avatar}>{row.DeliveryManName.charAt(0)}</div>
            <span>{row.DeliveryManName}</span>
          </div>
        ) : (
          "-"
        )}
      </td>

      <td>
        <span className={styles.remark}>{row.Remark || "-"}</span>
      </td>

      {/* ✅ 3. STATUS COLUMN WITH DROPDRON OR BADGE */}
      <td>
        {isLocked ? (
          <span className={getStatusBadgeClass()}>
            <i
              className={`mdi ${
                row.OrderStatus === "RTV"
                  ? "mdi-backup-restore"
                  : row.OrderStatus === "Complete"
                    ? "mdi-check-circle"
                    : "mdi-close-circle"
              }`}
            ></i>{" "}
            {row.OrderStatus || row.DeliveryStatus}
          </span>
        ) : (
          <select
            className={styles.statusDropdown}
            value={row.DeliveryStatus || "Pending"}
            onChange={(e) => onStatusChange(row, e.target.value)}
            disabled={!row.AssignID}
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Complete">Complete</option>
            <option value="Cancel">Cancel</option>
            <option value="RTV">RTV</option>
          </select>
        )}
      </td>

      {/* ✅ 4. ACTIONS COLUMN */}
      <td>
        <div className="d-flex gap-1">
          <button
            className={`btn ${row.AssignID ? "btn-warning" : "btn-primary"} btn-sm`}
            onClick={onAssignClick}
            disabled={isLocked}
            title={isLocked ? "Order Locked" : "Assign/Reassign"}
          >
            {row.AssignID ? "Reassign" : "Assign"}
          </button>

          <button
            className="btn btn-info btn-sm"
            onClick={() => onEditClick(row)}
            disabled={isLocked}
            title={isLocked ? "Order Locked" : "Edit Quantity"}
          >
            <i className="mdi mdi-pencil"></i>
          </button>

          <button
            className="btn btn-dark btn-sm"
            onClick={() => onInvoiceClick(row)}
            title="Generate Invoice"
          >
            <i className="mdi mdi-file-document"></i>
          </button>
        </div>
      </td>

      {/* Payment Summary or RTV status */}
      <td>
        {row.DeliveryStatus === "RTV" || row.OrderStatus === "RTV" ? (
          <span className="text-danger font-weight-bold">RTV PROCESSED</span>
        ) : (
          <span className={styles.paymentMode}>
            {formatPaymentSummary(row.PaymentSummary)}
          </span>
        )}
      </td>

      {/* ✅ 5. DIRECT RTV BUTTON */}
      <td>
        <button
          className="btn btn-outline-danger btn-sm"
          onClick={() => onRTVClick(row)}
          disabled={row.OrderStatus === "RTV" || row.DeliveryStatus === "RTV"}
        >
          <i className="mdi mdi-backup-restore"></i>
        </button>
      </td>
    </tr>
  );
};

// Separate component for table footer
const TableFooter = ({
  indexOfFirstItem,
  indexOfLastItem,
  totalItems,
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  onPaginate,
  getPageNumbers,
}) => {
  return (
    <>
      <div className={styles.tableFooter}>
        <div className={styles.tableInfo}>
          Showing {indexOfFirstItem + 1} to{" "}
          {Math.min(indexOfLastItem, totalItems)} of {totalItems} orders
        </div>
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={onPrevPage}
            disabled={currentPage === 1}
          >
            <i className="mdi mdi-chevron-left"></i> Previous
          </button>

          {getPageNumbers().map((number, index) =>
            number === "..." ? (
              <span key={`ellipsis-${index}`} className={styles.paginationInfo}>
                ...
              </span>
            ) : (
              <button
                key={number}
                className={`${styles.pageBtn} ${
                  currentPage === number ? styles.active : ""
                }`}
                onClick={() => onPaginate(number)}
              >
                {number}
              </button>
            ),
          )}

          <button
            className={styles.pageBtn}
            onClick={onNextPage}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next <i className="mdi mdi-chevron-right"></i>
          </button>
        </div>
      </div>
    </>
  );
};

export default UserForm;
