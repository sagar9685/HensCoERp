import React from "react";
import styles from "./ViewOrderModal.module.css";
import {
  FaTimes,
  FaUser,
  FaTruck,
  FaMoneyBillWave,
  FaInfoCircle,
} from "react-icons/fa";

const ViewOrderModal = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Order Details: #{order.OrderID}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Customer Info Section */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <FaUser /> Customer Information
            </h3>
            <div className={styles.grid}>
              <div className={styles.infoGroup}>
                <label>Customer Name</label>
                <p>{order.CustomerName || "N/A"}</p>
              </div>
              <div className={styles.infoGroup}>
                <label>Contact No</label>
                <p>{order.ContactNo || "N/A"}</p>
              </div>
              <div className={styles.infoGroup + " " + styles.fullWidth}>
                <label>Address</label>
                <p>
                  {order.Address}, {order.Area}
                </p>
              </div>
            </div>
          </section>

          {/* Product & Logistics Section */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <FaTruck /> Logistics & Timing
            </h3>
            <div className={styles.grid}>
              <div className={styles.infoGroup}>
                <label>Order Date</label>
                <p>{formatDate(order.OrderDate)}</p>
              </div>
              <div className={styles.infoGroup}>
                <label>Delivery Date</label>
                <p>{formatDate(order.DeliveryDate)}</p>
              </div>
              <div className={styles.infoGroup}>
                <label>Delivery Man</label>
                <p>{order.DeliveryManName || "Not Assigned"}</p>
              </div>
              <div className={styles.infoGroup}>
                <label>Order Taken By</label>
                <p>{order.OrderTakenBy || "N/A"}</p>
              </div>
            </div>
          </section>

          {/* Payment Section */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <FaMoneyBillWave /> Payment & Status
            </h3>
            <div className={styles.grid}>
              <div className={styles.infoGroup}>
                <label>Order Status</label>
                <p className={styles.statusText}>
                  {order.OrderStatus || "Pending"}
                </p>
              </div>
              <div className={styles.infoGroup}>
                <label>Payment Status</label>
                <p>{order.PaymentVerifyStatus || "Pending"}</p>
              </div>
              <div className={styles.infoGroup}>
                <label>Delivery Charge</label>
                <p>₹{order.DeliveryCharge || 0}</p>
              </div>
              <div className={styles.infoGroup}>
                <label>Payment Summary</label>
                <p>{order.PaymentSummary || "No payment data"}</p>
              </div>
            </div>
          </section>

          {/* Remarks Section */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <FaInfoCircle /> Additional Info
            </h3>
            <div className={styles.grid}>
              <div className={styles.infoGroup + " " + styles.fullWidth}>
                <label>Remark</label>
                <p>{order.Remark || "No remarks"}</p>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.doneBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewOrderModal;
