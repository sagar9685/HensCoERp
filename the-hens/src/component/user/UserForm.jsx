import UserFooter from "./UserFooter";
import UserNavbar from "./UserNavBar";
import UserSideBar from "./UserSidebar";
import styles from "./UserForm.module.css";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { fetchOrder } from "../../features/orderSlice";
import AssignOrderModal from "./AssignOrderModal";
import { fetchAssignOrder } from "../../features/assignedOrderSlice";
 
const UserForm = () => {
  const dispatch = useDispatch();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchOrder());
  }, [dispatch]);

  useEffect (()=> {
    dispatch(fetchAssignOrder())
  },[dispatch])

  // const orders = useSelector((state) => state.order.record);
const assignedOrders = useSelector((state) => state.order.record);
console.log(assignedOrders,"assigned order")


  const getPaymentStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return styles.paid;
      case 'pending': return styles.pending;
      case 'failed': return styles.failed;
      default: return '';
    }
  };

  const handleAssignOrder = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleAssignSubmit = (formData) => {
    console.log('Assigning order:', selectedOrder.OrderID, 'with data:', formData);
    // Add your assign order logic here
    // You can dispatch an action to update the order
    handleCloseModal();
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
                        <h4 className={styles.cardTitle}>Orders List</h4>
                        <div className={styles.headerActions}>
                          <button className={`btn btn-success ${styles.actionBtn}`}>
                            <i className="mdi mdi-download"></i> Export
                          </button>
                        </div>
                      </div>

                      <div className={styles.tableWrapper}>
                        <table className={styles.dataTable}>
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Customer</th>
                              <th>Contact</th>
                              <th>Area</th>
                              <th>Type</th>
                              <th>Weight</th>
                              <th>Qty</th>
                              <th>Amount</th>
                              <th>Order Date</th>
                              <th>Delivery Date</th>
                              <th>Delivery Man</th>
                              <th>Payment Mode</th>
                              <th>Remark</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assignedOrders?.map((row) => (
                              <tr key={row.OrderID}>
                                <td className={styles.productCell}>
                                  <div className={styles.productInfo}>
                                    <strong>{row.ProductName}</strong>
                                    <small>{row.ProductType}</small>
                                  </div>
                                </td>

                                <td>
                                  <div className={styles.customerInfo}>
                                    <strong>{row.CustomerName}</strong>
                                    <span>{row.Address}</span>
                                  </div>
                                </td>

                                <td className={styles.contactCell}>{row.ContactNo}</td>
                                <td className={styles.areaCell}>{row.Area}</td>
                                <td className={styles.typeCell}>{row.ProductType}</td>
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
{/* Delivery Date from AssignedOrders */}
<td className={styles.dateCell}>
  {row.DeliveryDate
    ? new Date(row.DeliveryDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      }).replace(",", "").toLowerCase()
    : "-"}
</td>


{/* Delivery Man from AssignedOrders */}
<td className={styles.deliveryCell}>
  {row.DeliveryManName || "-"}
</td>

{/* Payment Mode from AssignedOrders */}
<td>
  <span className={styles.paymentMode}>
    {row.PaymentMode || "-"}
  </span>
</td>

{/* Remark */}
<td>
  <span className={styles.paymentMode}>
    {row.Remark || "-"}
  </span>
</td>

                                <td>
                                  <span className={`${styles.statusBadge} ${getPaymentStatusClass(row.PaymentStatus)}`}>
                                    {row.PaymentStatus}
                                  </span>
                                </td>

                                <td>
                                  <div className={styles.actionButtons}>
                                    <button 
                                      className={styles.assignBtn}
                                      onClick={() => handleAssignOrder(row)}
                                      disabled={row.PaymentStatus?.toLowerCase() === 'assigned'}
                                    >
                                      <i className="mdi mdi-check-circle"></i>
                                      {row.PaymentStatus?.toLowerCase() === 'assigned' ? 'Assigned' : 'Assign'}
                                    </button>

                                    <button className={styles.viewBtn}>
                                      <i className="mdi mdi-eye"></i>
                                    </button>

                                    <button className={styles.editBtn}>
                                      <i className="mdi mdi-pencil"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className={styles.tableFooter}>
                        <div className={styles.tableInfo}>
                          Showing {assignedOrders?.length || 0} of {assignedOrders?.length || 0} orders
                        </div>
                        <div className={styles.pagination}>
                          <button className={styles.pageBtn}>Previous</button>
                          <button className={`${styles.pageBtn} ${styles.active}`}>1</button>
                          <button className={styles.pageBtn}>2</button>
                          <button className={styles.pageBtn}>3</button>
                          <button className={styles.pageBtn}>Next</button>
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

      {/* Assign Order Modal */}
      <AssignOrderModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleAssignSubmit}
        order={selectedOrder}
      />
    </>
  );
}

export default UserForm;