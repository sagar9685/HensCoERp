import UserFooter from "./UserFooter";
import UserNavbar from "./UserNavBar";
import UserSideBar from "./UserSidebar";
import styles from "./UserForm.module.css";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { fetchOrder } from "../../features/orderSlice";
import AssignOrderModal from "./AssignOrderModal";
import UserCompleteOrderModal from "./UserCompleteOrderModal";
import { assignOrder, fetchAssignOrder } from "../../features/assignedOrderSlice";
import { toast } from "react-toastify";
import ExcelExport from "../ExcelExport";

const UserForm = () => {
  const dispatch = useDispatch();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [isCompleteModalOpen, setCompleteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const formatPaymentSummary = (summary) => {
  if (!summary) return "-";

  
  return summary
    .split("|")
    .map(item => item.trim())
    .filter(item => {
      const amount = parseFloat(item.split(":")[1]);
      return amount > 0;
    })
    .join(" | ");
};


  useEffect(() => {
    dispatch(fetchOrder());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchAssignOrder());
  }, [dispatch]);

  const assignedOrders = useSelector((state) => state.assignedOrders.data);

  // Filter and sort logic
  const filteredAndSortedOrders = assignedOrders?.filter(order => {
    const matchesSearch = 
      order.CustomerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.ProductName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.OrderID?.toString().includes(searchTerm);
    
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "completed" && order.OrderStatus === "Complete") ||
      (statusFilter === "pending" && order.OrderStatus === "Pending");
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  }) || [];

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSortedOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleStatusChange = (row, newStatus) => {
    if (newStatus === "Complete") {
      setConfirmOrder(row);
      setCompleteModalOpen(true);
    } else if (newStatus === "Pending") {
      if (window.confirm("Are you sure you want to mark this order as pending?")) {
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
      await dispatch(updateOrderStatus({
        orderId: order.OrderID,
        assignedOrderId: order.AssignedOrderID,
        status: status
      })).unwrap();
      toast.success(`Order status updated to ${status} successfully!`);
      dispatch(fetchAssignOrder());
    } catch (error) {
      toast.error("Failed to update order status", error);
    }
  };

  const handleAssignSubmit = async (payload) => {
    try {
      await dispatch(assignOrder(payload)).unwrap();
      toast.success("Order assigned successfully!");
      dispatch(fetchAssignOrder());
      handleCloseModal();
    } catch (error) {
      toast.error("Failed to assign order", error);
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

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pageNumbers.push(i);
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
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
                    <li className="breadcrumb-item"><a href="#">Dashboard</a></li>
                    <li className="breadcrumb-item active" aria-current="page">All Orders</li>
                  </ol>
                </nav>
              </div>
              
              <div className="row">
                <div className="col-12 grid-margin">
                  <div className="card">
                    <div className="card-body">
                      <div className={styles.cardHeader}>
                        <div className={styles.headerContent}>
                          <h4 className={styles.cardTitle}>Orders List</h4>
                          <div className={styles.orderStats}>
                            <div className={styles.statItem}>
                              <span className={styles.statNumber}>{assignedOrders?.length || 0}</span>
                              <span className={styles.statLabel}>Total Orders</span>
                            </div>
                            <div className={styles.statItem}>
                              <span className={styles.statNumber}>
                                {assignedOrders?.filter(order => order.OrderStatus === "Complete").length || 0}
                              </span>
                              <span className={styles.statLabel}>Completed</span>
                            </div>
                            <div className={styles.statItem}>
                              <span className={styles.statNumber}>
                                {assignedOrders?.filter(order => order.OrderStatus === "Pending").length || 0}
                              </span>
                              <span className={styles.statLabel}>Pending</span>
                            </div>
                          </div>
                        </div>
                        <div className={styles.headerActions}>
                          <div className={styles.filterControls}>
                            <div className={styles.searchBox}>
                              <i className="mdi mdi-magnify"></i>
                              <input
                                type="text"
                                placeholder="Search orders..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                              />
                            </div>
                            <select 
                              className={styles.statusFilter}
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                            >
                              <option value="all">All Status</option>
                              <option value="pending">Pending</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                          <ExcelExport data={filteredAndSortedOrders} fileName="Orders_List.xlsx">
                            <button className={`btn btn-success ${styles.actionBtn}`}>
                              <i className="mdi mdi-download"></i> Export
                            </button>
                          </ExcelExport>
                        </div>
                      </div>

                      <div className={styles.tableContainer}>
                        <div className={styles.tableWrapper}>
                          <table className={styles.dataTable}>
                            <thead>
                              <tr>
                                <th onClick={() => handleSort('ProductName')}>
                                  Product {sortConfig.key === 'ProductName' && (
                                    <i className={`mdi mdi-chevron-${sortConfig.direction === 'asc' ? 'up' : 'down'}`}></i>
                                  )}
                                </th>
                                <th onClick={() => handleSort('CustomerName')}>
                                  Customer {sortConfig.key === 'CustomerName' && (
                                    <i className={`mdi mdi-chevron-${sortConfig.direction === 'asc' ? 'up' : 'down'}`}></i>
                                  )}
                                </th>
                                <th>Contact</th>
                                <th>Area</th>
                                <th>Type</th>
                                <th>Weight</th>
                                <th>Qty</th>
                                <th>Amount</th>
                                <th onClick={() => handleSort('OrderDate')}>
                                  Order Date {sortConfig.key === 'OrderDate' && (
                                    <i className={`mdi mdi-chevron-${sortConfig.direction === 'asc' ? 'up' : 'down'}`}></i>
                                  )}
                                </th>
                                <th>Delivery Date</th>
                                <th>Delivery Man</th>
                                <th>Remark</th>
                                <th>Delivery Status</th>
                                <th>Payment Mode</th>
                                {/* <th>Actions</th> */}
                              </tr>
                            </thead>
                            <tbody>
                              {currentItems.length > 0 ? (
                                currentItems.map((row) => (
                                  <tr key={row.OrderID} className={row.OrderStatus === "Complete" ? styles.completedRow : ""}>
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
                                      <span className={`${styles.typeBadge} ${row.ProductType === 'Express' ? styles.express : ''}`}>
                                        {row.ProductType}
                                      </span>
                                    </td>
                                    <td className={styles.weightCell}>{row.Weight}</td>
                                    <td className={styles.quantityCell}>{row.Quantity}</td>

                                    <td className={styles.amountCell}>
                                      <div className={styles.amountInfo}>
                                        <div>Rate: ₹{row.Rate}</div>
                                        <div>Delivery: ₹{row.DeliveryCharge}</div>
                                        <strong>Total: ₹{Number(row.Rate) + Number(row.DeliveryCharge)}</strong>
                                      </div>
                                    </td>

                                    <td className={styles.dateCell}>
                                      {new Date(row.OrderDate)
                                        .toLocaleDateString('en-GB', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: '2-digit'
                                        })
                                        .replace(',', '')
                                        .replace(' ', '-')}
                                    </td>

                                    <td className={styles.dateCell}>
                                      {row.DeliveryDate
                                        ? new Date(row.DeliveryDate).toLocaleDateString("en-GB", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "2-digit",
                                          }).replace(",", "").toLowerCase()
                                        : "-"}
                                    </td>

                                    <td className={styles.deliveryCell}>
                                      {row.DeliveryManName ? (
                                        <div className={styles.deliveryMan}>
                                          <div className={styles.avatar}>
                                            {row.DeliveryManName.charAt(0)}
                                          </div>
                                          <span>{row.DeliveryManName}</span>
                                        </div>
                                      ) : (
                                        "-"
                                      )}
                                    </td>

                                    <td>
                                      <span className={styles.remark}>
                                        {row.Remark || "-"}
                                      </span>
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
  onChange={(e) => handleStatusChange(row, e.target.value)}
  disabled={!row.AssignID || row.OrderStatus === "Complete"}  
>
  <option value="Pending">Pending</option>
  <option value="In Progress">In Progress</option>
  <option value="Complete">Complete</option>
</select>

                                      )}
                                    </td>

                                    <td>
  <span className={styles.paymentMode}>
    {formatPaymentSummary(row.PaymentSummary)}
  </span>
</td>


                                  
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="15" className={styles.emptyState}>
                                    <div className={styles.emptyContent}>
                                      <i className="mdi mdi-package-variant"></i>
                                      <h4>No orders found</h4>
                                      <p>Try adjusting your search or filter to find what you're looking for.</p>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className={styles.tableFooter}>
                        <div className={styles.tableInfo}>
                          Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAndSortedOrders.length)} of {filteredAndSortedOrders.length} orders
                        </div>
                        <div className={styles.pagination}>
                          <button 
                            className={styles.pageBtn} 
                            onClick={prevPage}
                            disabled={currentPage === 1}
                          >
                            <i className="mdi mdi-chevron-left"></i> Previous
                          </button>
                          
                          {getPageNumbers().map((number, index) => (
                            number === '...' ? (
                              <span key={`ellipsis-${index}`} className={styles.paginationInfo}>...</span>
                            ) : (
                              <button
                                key={number}
                                className={`${styles.pageBtn} ${currentPage === number ? styles.active : ''}`}
                                onClick={() => paginate(number)}
                              >
                                {number}
                              </button>
                            )
                          ))}
                          
                          <button 
                            className={styles.pageBtn} 
                            onClick={nextPage}
                            disabled={currentPage === totalPages || totalPages === 0}
                          >
                            Next <i className="mdi mdi-chevron-right"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <UserFooter />
          </div>
        </div>
      </div>

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
}

export default UserForm;