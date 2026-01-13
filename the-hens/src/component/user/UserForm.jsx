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
} from "../../features/assignedOrderSlice";
import { toast } from "react-toastify";
import ExcelExport from "../ExcelExport";
import { useOrderFilter } from "./UserOrderFilter";

const UserForm = () => {
  const dispatch = useDispatch();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [isCompleteModalOpen, setCompleteModalOpen] = useState(false);

  // Use the custom hook for filtering and pagination
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    areaFilter,
    setAreaFilter,
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
  } = useOrderFilter();

  useEffect(() => {
    dispatch(fetchOrder());
    dispatch(fetchAssignOrder());
  }, [dispatch]);

  const handleStatusChange = (row, newStatus) => {
    if (newStatus === "Complete") {
      setConfirmOrder(row);
      setCompleteModalOpen(true);
    } else if (newStatus === "Pending") {
      if (
        window.confirm("Are you sure you want to mark this order as pending?")
      ) {
        updateOrderStatusHandler(row, "Pending");
      }
    }
  };

  const handleCompleteOrder = async (payload) => {
    try {
      await dispatch(updateOrderStatus(payload)).unwrap();
      toast.success("Order marked as completed successfully!");
      dispatch(fetchAssignOrder());
      handleCloseCompleteModal();
    } catch (error) {
      toast.error("Failed to update order status", error);
    }
  };

  const updateOrderStatusHandler = async (order, status) => {
    try {
      await dispatch(
        updateOrderStatus({
          orderId: order.OrderID,
          assignedOrderId: order.AssignedOrderID,
          status: status,
        })
      ).unwrap();
      toast.success(`Order status updated to ${status} successfully!`);
      dispatch(fetchAssignOrder());
    } catch (error) {
      toast.error("Failed to update order status", error);
    }
  };

  // UserForm.js ke andar handleAssignSubmit function ko replace karein:

  const handleAssignSubmit = async (payload) => {
    try {
      // Note: Check if your table row data uses 'AssignID' (uppercase/lowercase)
      const assignmentId = selectedOrder?.AssignID;

      if (assignmentId) {
        console.log("Action: Reassigning Order ID", assignmentId);
        await dispatch(
          updateAssignedOrder({
            assignmentId: assignmentId,
            ...payload,
          })
        ).unwrap();
        toast.success("Order reassigned successfully");
      } else {
        console.log("Action: First time assignment");
        await dispatch(assignOrder(payload)).unwrap();
        toast.success("Order assigned successfully");
      }

      dispatch(fetchAssignOrder());
      handleCloseModal();
    } catch (err) {
      console.error("UI ERROR:", err);
      toast.error(err.message || "Failed to process assignment");
    }
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

              <div className="row">
                <div className="col-12 grid-margin">
                  <div className="card">
                    <div className="card-body">
                      {/* Header Section */}
                      <div className={styles.cardHeader}>
                        <div className={styles.headerContent}>
                          <h4 className={styles.cardTitle}>Orders List</h4>
                          <div className={styles.orderStats}>
                            <div className={styles.statItem}>
                              <span className={styles.statNumber}>
                                {assignedOrders?.length || 0}
                              </span>
                              <span className={styles.statLabel}>
                                Total Orders
                              </span>
                            </div>
                            <div className={styles.statItem}>
                              <span className={styles.statNumber}>
                                {assignedOrders?.filter(
                                  (o) => o.OrderStatus === "Complete"
                                ).length || 0}
                              </span>
                              <span className={styles.statLabel}>
                                Completed
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className={styles.headerActions}>
                          <div className={styles.filterControls}>
                            {/* Search */}
                            <div className={styles.searchBox}>
                              <i className="mdi mdi-magnify"></i>
                              <input
                                type="text"
                                placeholder="Search orders..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                              />
                            </div>

                            {/* Dynamic Area Filter */}
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

                            {/* Dynamic Delivery Boy Filter */}
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
                                    .map((o) => o.DeliveryManName)
                                ),
                              ]
                                .sort()
                                .map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                            </select>

                            {/* Status Filter */}
                            <select
                              className={styles.statusFilter}
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                            >
                              <option value="all">All Status</option>
                              <option value="pending">Pending</option>
                              <option value="complete">Completed</option>
                            </select>
                          </div>

                          <ExcelExport
                            data={filteredAndSortedOrders}
                            fileName="Filtered_Orders.xlsx"
                          >
                            <button className="btn btn-success">
                              <i className="mdi mdi-download"></i> Export
                            </button>
                          </ExcelExport>
                        </div>
                      </div>

                      {/* Table Section */}
                      <div className={styles.tableContainer}>
                        <div className={styles.tableWrapper}>
                          <table className={styles.dataTable}>
                            <thead>
                              <tr>
                                <th onClick={() => handleSort("ProductName")}>
                                  Product{" "}
                                  {sortConfig.key === "ProductName" && (
                                    <i
                                      className={`mdi mdi-chevron-${
                                        sortConfig.direction === "asc"
                                          ? "up"
                                          : "down"
                                      }`}
                                    ></i>
                                  )}
                                </th>
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
                                    formatPaymentSummary={formatPaymentSummary}
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
    </>
  );
};

// Separate component for table row
const OrderTableRow = ({
  row,
  onStatusChange,
  onAssignClick,
  formatPaymentSummary,
}) => {
  return (
    <tr
      key={row.OrderID}
      className={row.OrderStatus === "Complete" ? styles.completedRow : ""}
    >
      <td className={styles.productCell}>
        <div className={styles.productInfo}>
          <div className={styles.productImage}>
            <i className="mdi mdi-package-variant"></i>
          </div>
          <div className={styles.productDetails}>
            <strong>{row.ProductName}</strong>
            <small>{row.ProductType}</small>
          </div>
        </div>
      </td>
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
      <td className={styles.dateCell}>
        {new Date(row.OrderDate)
          .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
          })
          .replace(",", "")
          .replace(" ", "-")}
      </td>
      <td className={styles.dateCell}>
        {row.DeliveryDate
          ? new Date(row.DeliveryDate)
              .toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "2-digit",
              })
              .replace(",", "")
              .toLowerCase()
          : "-"}
      </td>
      <td className={styles.dateCell}>
        {row.PaymentReceivedDate
          ? new Date(row.PaymentReceivedDate)
              .toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "2-digit",
              })
              .replace(",", "")
              .toLowerCase()
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
      {/* Delivery Status Column */}
      <td>
        {row.OrderStatus === "Complete" ? (
          <span className={styles.completedBadge}>
            <i className="mdi mdi-check-circle"></i>
            Completed
          </span>
        ) : (
          <select
            className={styles.statusDropdown}
            value={row.DeliveryStatus}
            onChange={(e) => onStatusChange(row, e.target.value)}
            disabled={!row.AssignID || row.OrderStatus === "Complete"}
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Complete">Complete</option>
            <option value="Cancel">Cancel</option>
          </select>
        )}
      </td>
      {/* // Inside OrderTableRow component */}
      {/* // OrderTableRow.jsx */}
      <td>
        {row.AssignID ? (
          <button className="btn btn-warning btn-sm" onClick={onAssignClick}>
            Reassign
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={onAssignClick}>
            Assign
          </button>
        )}
      </td>
      <td>
        <span className={styles.paymentMode}>
          {formatPaymentSummary(row.PaymentSummary)}
        </span>
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
          )
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
  );
};

export default UserForm;
