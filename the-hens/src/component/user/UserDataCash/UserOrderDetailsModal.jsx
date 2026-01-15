// OrderDetailsModal.jsx
import React, { useEffect } from "react";
import styles from "./OrderDetailsModal.module.css";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPendingCashOrders,
  clearPendingOrders,
} from "../../../features/paymentModeSlice";
import {
  FiX,
  FiPrinter,
  FiDownload,
  FiUser,
  FiCalendar,
  FiDollarSign,
} from "react-icons/fi";
import { HiDocumentText } from "react-icons/hi";
// import PrintOrderDetails from "./PrintOrderDetails";
import { printOrderDetails, downloadOrderCSV } from "./PrintOrderDetails";
// import { clearOrders } from "../../../features/denominationSlice";

export default function OrderDetailsModal({ deliveryManId, onClose }) {
  const dispatch = useDispatch();
  const pendingData = useSelector((state) => state.pendingCashOrders);
  const orders = pendingData?.list || [];
  const loading = pendingData?.loading;
  console.log(orders, "order click on details");

  const safeOrders = orders || [];

  useEffect(() => {
    if (deliveryManId) {
      dispatch(fetchPendingCashOrders(deliveryManId));
    }
    return () => {
      dispatch(clearPendingOrders());
    };
  }, [deliveryManId, dispatch]);

  // Calculate totals
  const totalCash = orders.reduce(
    (sum, order) => sum + (Number(order.CashAmount) || 0),
    0
  );
  const totalOrders = orders.length;
  const totalQuantity = orders.reduce(
    (sum, order) => sum + (Number(order.Quantity) || 0),
    0
  );
  const deliveryManName = safeOrders[0]?.DeliveryManName || "Delivery Man";
  // Import print utility

  // Print function
  const handlePrint = () => {
    printOrderDetails(orders, deliveryManId, deliveryManName);
  };

  // Download CSV function
  const handleDownloadCSV = () => {
    downloadOrderCSV(orders, deliveryManId, deliveryManName);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalContainer}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <HiDocumentText className={styles.headerIcon} />
              <div>
                <h3>Pending Cash Orders</h3>
                {deliveryManId && (
                  <p className={styles.deliveryManId}>
                    Delivery Man: <span>{deliveryManName}</span>
                  </p>
                )}
              </div>
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.actionBtn}
                onClick={handleDownloadCSV}
                title="Download CSV"
              >
                <FiDownload />
              </button>
              <button
                className={styles.actionBtn}
                onClick={handlePrint}
                title="Print Report"
              >
                <FiPrinter />
              </button>
              <button
                className={styles.closeBtn}
                onClick={onClose}
                title="Close"
              >
                <FiX />
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {!loading && orders.length > 0 && (
            <div className={styles.summaryCards}>
              <div className={styles.summaryCard}>
                <div className={styles.cardIcon}>
                  <HiDocumentText />
                </div>
                <div className={styles.cardContent}>
                  <span className={styles.cardLabel}>Total Orders</span>
                  <span className={styles.cardValue}>{totalOrders}</span>
                </div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.cardIcon}>
                  <FiUser />
                </div>
                <div className={styles.cardContent}>
                  <span className={styles.cardLabel}>Total Quantity</span>
                  <span className={styles.cardValue}>{totalQuantity}</span>
                </div>
              </div>
              <div className={`${styles.summaryCard} ${styles.totalCard}`}>
                <div className={styles.cardIcon}>
                  <FiDollarSign />
                </div>
                <div className={styles.cardContent}>
                  <span className={styles.cardLabel}>Total Cash</span>
                  <span className={styles.cardValue}>
                    ₹{totalCash.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className={styles.content}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Loading pending orders...</p>
              </div>
            ) : (
              <div className={styles.tableSection}>
                {orders.length === 0 ? (
                  <div className={styles.emptyState}>
                    <HiDocumentText className={styles.emptyIcon} />
                    <h4>No Pending Cash Orders</h4>
                    <p>
                      There are no pending cash orders for this delivery person.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className={styles.tableWrapper}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Invoice No</th>
                            <th>Customer</th>
                            <th>Product</th>
                            <th className={styles.textCenter}>Qty</th>
                            <th className={styles.textRight}>Rate</th>
                            <th className={styles.textRight}>Delivery</th>
                            <th className={styles.textRight}>Amount</th>
                            <th>Date</th>
                            <th>Address</th>
                            <th>Area</th>
                            <th>Contact</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order) => (
                            <tr
                              key={order.PaymentID}
                              className={styles.tableRow}
                            >
                              <td className={styles.orderId}>
                                {order.OrderID}
                              </td>
                              <td className={styles.invoiceNo}>
                                {order.InvoiceNo}
                              </td>
                              <td className={styles.customerName}>
                                {order.CustomerName}
                              </td>
                              <td className={styles.productType}>
                                {order.ProductType}
                              </td>
                              <td className={styles.textCenter}>
                                {order.Quantity}
                              </td>
                              <td
                                className={`${styles.textRight} ${styles.rate}`}
                              >
                                ₹{order.Rate || 0}
                              </td>
                              <td
                                className={`${styles.textRight} ${styles.delivery}`}
                              >
                                ₹{order.DeliveryCharge || 0}
                              </td>
                              <td
                                className={`${styles.amount} ${styles.textRight}`}
                              >
                                ₹{order.CashAmount?.toFixed(2)}
                              </td>
                              <td className={styles.date}>
                                <FiCalendar className={styles.dateIcon} />
                                {order.PaymentDate?.split("T")[0]}
                              </td>
                              <td className={styles.address}>
                                {order.Address}
                              </td>
                              <td className={styles.area}>{order.Area}</td>
                              <td className={styles.contact}>
                                {order.ContactNo}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className={styles.tableFooter}>
                      <div className={styles.footerInfo}>
                        Showing <strong>{orders.length}</strong> pending cash
                        orders
                      </div>
                      <div className={styles.footerTotal}>
                        Total: <span>₹{totalCash.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
