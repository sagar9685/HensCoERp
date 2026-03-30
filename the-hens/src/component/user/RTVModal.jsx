import { useState, useEffect } from "react";
import styles from "./RTVModal.module.css";
import { useDispatch } from "react-redux";
import { addRTV } from "../../features/orderSlice";
import { toast } from "react-toastify";
import {
  FiX,
  FiPackage,
  FiCalendar,
  FiTag,
  FiHash,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";

const RTVModal = ({ isOpen, onClose, row, username }) => {
  const dispatch = useDispatch();

  const [qty, setQty] = useState("");
  const [rtvDate, setRtvDate] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (row) {
      setQty("");
      setReason("");
      setCustomReason("");
      setSelectedIndex(0);
      setRtvDate(new Date().toISOString().split("T")[0]);
      setIsSubmitting(false);
    }
  }, [row]);

  if (!isOpen || !row) return null;

  // split multi items
  const items = row.ProductTypes?.split(",") || [];
  const weights = row.Weights?.split(",") || [];
  const rates = row.Rates?.split(",") || [];
  const qtys = row.Quantities?.split(",") || [];
  const itemIds = row.ItemIDs?.split(",") || [];

  const item = items[selectedIndex]?.trim();
  const weight = weights[selectedIndex]?.trim();
  const rate = rates[selectedIndex]?.trim();
  const maxQty = qtys[selectedIndex]?.trim();
  const itemId = itemIds[selectedIndex]?.trim();

  const handleSubmit = async () => {
    if (!qty || Number(qty) <= 0) {
      toast.error("Enter valid quantity");
      return;
    }

    if (Number(qty) > Number(maxQty)) {
      toast.error("RTV qty cannot exceed order qty");
      return;
    }

    if (!rtvDate) {
      toast.error("Select RTV date");
      return;
    }

    const finalReason = reason === "Other" ? customReason : reason;

    if (!finalReason) {
      toast.error("Select reason");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        OrderID: row.OrderID,
        ItemID: itemId,
        ProductType: item,
        Weight: weight,
        Quantity: Number(qty),
        Rate: rate,
        RTVDate: rtvDate,
        reason: finalReason,
        username,
      };

      await dispatch(addRTV(payload)).unwrap();

      toast.success("RTV added successfully");
      onClose();
    } catch (err) {
      toast.error("RTV failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <FiPackage className={styles.headerIcon} />
            <h4>Return To Vendor</h4>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className={styles.body}>
          {/* Item Dropdown */}
          <div className={styles.field}>
            <label>
              <FiTag className={styles.fieldIcon} />
              Select Item
            </label>
            <select
              value={selectedIndex}
              onChange={(e) => setSelectedIndex(Number(e.target.value))}
              className={styles.select}
            >
              {items.map((it, i) => (
                <option key={i} value={i}>
                  {it.trim()} ({weights[i]}) - Available: {qtys[i]}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>
                <FiPackage className={styles.infoIcon} />
                <span>Weight</span>
              </div>
              <div className={styles.infoValue}>{weight || "-"}</div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>
                <FiTag className={styles.infoIcon} />
                <span>Rate</span>
              </div>
              <div className={styles.infoValue}>
                {rate ? `₹${parseFloat(rate).toFixed(2)}` : "-"}
              </div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>
                <FiHash className={styles.infoIcon} />
                <span>Order Qty</span>
              </div>
              <div className={styles.infoValue}>{maxQty || "-"}</div>
            </div>
          </div>

          <div className={styles.field}>
            <label>
              <FiAlertCircle className={styles.fieldIcon} />
              RTV Quantity
            </label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Enter return quantity"
              className={styles.input}
              min="1"
              max={maxQty}
            />
          </div>

          <div className={styles.field}>
            <label>
              <FiCalendar className={styles.fieldIcon} />
              RTV Date
            </label>
            <input
              type="date"
              value={rtvDate}
              onChange={(e) => setRtvDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label>Reason for Return</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={styles.select}
            >
              <option value="">Select reason</option>
              <option value="Customer Return">Customer Return</option>
              <option value="Damage">Damage</option>
              <option value="Expired">Expired</option>
              <option value="Wrong Supply">Wrong Supply</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {reason === "Other" && (
            <div className={`${styles.field} ${styles.customReasonField}`}>
              <label>Custom Reason</label>
              <input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please specify the reason..."
                className={styles.input}
              />
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className={styles.spinner}></div>
                Submitting...
              </>
            ) : (
              <>
                <FiCheckCircle />
                Submit RTV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RTVModal;
