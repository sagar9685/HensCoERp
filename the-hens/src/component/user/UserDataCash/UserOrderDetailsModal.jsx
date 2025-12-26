import React, { useEffect } from "react";
import styles from "./OrderDetailsModal.module.css";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPendingCashOrders,
  clearPendingOrders
} from "../../../features/paymentModeSlice";

export default function OrderDetailsModal({ deliveryManId, onClose }) {
  const dispatch = useDispatch();

  const { list: orders, loading } = useSelector(
    (state) => state.pendingCashOrders
  );

  useEffect(() => {
    if (deliveryManId) {
      dispatch(fetchPendingCashOrders(deliveryManId));
    }

    return () => {
      dispatch(clearPendingOrders()); // cleanup on close
    };
  }, [deliveryManId, dispatch]);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Pending Cash Orders</h3>
          <button onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <p className={styles.loading}>Loading...</p>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Cash</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center" }}>
                      No pending cash orders
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.PaymentID}>
                      <td>{o.OrderID}</td>
                      <td>{o.InvoiceNo}</td>
                      <td>{o.CustomerName}</td>
                      <td>{o.ProductType}</td>
                      <td>{o.Quantity}</td>
                      <td>₹{o.CashAmount}</td>
                      <td>{o.PaymentDate?.split("T")[0]}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
