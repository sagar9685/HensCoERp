import React, { useState, useEffect } from "react";
import styles from "./AssignOrderModal.module.css";
import { fetchDeliveryMen } from "../../features/assignedOrderSlice";
import { useDispatch, useSelector } from "react-redux";

const AssignOrderModal = ({ isOpen, onClose, order, onSubmit }) => {
  const dispatch = useDispatch();

  const { deliveryMen } = useSelector((state) => state.assignedOrders);

  const [formData, setFormData] = useState({
    deliveryDate: "",
    deliveryManId: "",
    otherDeliveryManName: "",
    remark: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchDeliveryMen());
  }, [dispatch]);

  useEffect(() => {
    if (order) {
      setFormData({
        deliveryDate: "",
        deliveryManId: "",
        otherDeliveryManName: "",
        remark: "",
      });
    }
  }, [order]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true); // disable button + show processing

    const payload = {
      orderId: order.OrderID,
      deliveryManId:
        formData.deliveryManId === "other"
          ? null
          : Number(formData.deliveryManId),
      otherDeliveryManName:
        formData.deliveryManId === "other"
          ? formData.otherDeliveryManName
          : null,
      deliveryDate: formData.deliveryDate,
      remark: formData.remark,
    };

    try {
      await onSubmit(payload); // parent function ko data bhejna
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false); // enable button back
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <i className="mdi mdi-truck-delivery"></i>
            Assign Order #{order.OrderID}
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="mdi mdi-close"></i>
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Order Info */}
          <div className={styles.orderInfoSection}>
            <h3 className={styles.sectionTitle}>Order Details</h3>
            <div className={styles.orderInfoGrid}>
              <div className={styles.infoItem}>
                <label>Product Name:</label>
                <span>{order.ProductName}</span>
              </div>

              <div className={styles.infoItem}>
                <label>Customer:</label>
                <span>{order.CustomerName}</span>
              </div>

              <div className={styles.infoItem}>
                <label>Contact:</label>
                <span>{order.ContactNo}</span>
              </div>

              <div className={styles.infoItem}>
                <label>Area:</label>
                <span>{order.Area}</span>
              </div>

              <div className={styles.infoItem}>
                <label>Product Type:</label>
                <span>{order.ProductType}</span>
              </div>

              <div className={styles.infoItem}>
                <label>Weight:</label>
                <span>{order.Weight}</span>
              </div>

              <div className={styles.infoItem}>
                <label>Quantity:</label>
                <span>{order.Quantity}</span>
              </div>

              <div className={styles.infoItem}>
                <label>Total Amount:</label>
                <span className={styles.amount}>
                  ₹{Number(order.Rate) + Number(order.DeliveryCharge)}
                </span>
              </div>

              <div className={styles.infoItem}>
                <label>Order Date:</label>
                <span>
                  {new Date(order.OrderDate)
                    .toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    })
                    .replace(",", "")
                    .replace(" ", "-")}
                </span>
              </div>
            </div>
          </div>

          {/* Assignment Form */}
          <form onSubmit={handleSubmit} className={styles.assignForm}>
            <h3 className={styles.sectionTitle}>Assignment Details</h3>

            <div className={styles.formGrid}>
              {/* Delivery Date */}
              <div className={styles.formGroup}>
                <label htmlFor="deliveryDate" className={styles.formLabel}>
                  <i className="mdi mdi-calendar"></i>
                  Delivery Date *
                </label>
                <input
                  type="date"
                  id="deliveryDate"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  required
                />
              </div>

              {/* Delivery Man Dropdown */}
              <div className={styles.formGroup}>
                <label htmlFor="deliveryMan" className={styles.formLabel}>
                  <i className="mdi mdi-account-tie"></i>
                  Delivery Man *
                </label>

                <select
                  id="deliveryMan"
                  name="deliveryManId"
                  value={formData.deliveryManId}
                  onChange={handleInputChange}
                  className={styles.formSelect}
                  required
                >
                  <option value="">Select Delivery Man</option>

                  {deliveryMen.map((dm) => (
                    <option key={dm.DeliveryManID} value={dm.DeliveryManID}>
                      {dm.Name}
                    </option>
                  ))}

                  <option value="other">Other</option>
                </select>

                {/* Other Delivery Man Name */}
                {formData.deliveryManId === "other" && (
                  <input
                    type="text"
                    name="otherDeliveryManName"
                    placeholder="Enter delivery man name"
                    value={formData.otherDeliveryManName}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                )}
              </div>

              {/* Remark */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="remark" className={styles.formLabel}>
                  <i className="mdi mdi-note-text"></i>
                  Remarks
                </label>
                <textarea
                  id="remark"
                  name="remark"
                  value={formData.remark}
                  onChange={handleInputChange}
                  className={styles.formTextarea}
                  placeholder="Enter any special instructions..."
                  rows="3"
                />
              </div>
            </div>
          </form>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            <i className="mdi mdi-close"></i>
            Cancel
          </button>
          <button
            type="submit"
            className={styles.assignButton}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              "Processing..."
            ) : (
              <>
                <i className="mdi mdi-check-circle"></i>
                Assign Order
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignOrderModal;
