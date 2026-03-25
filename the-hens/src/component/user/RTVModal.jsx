import { useState, useEffect } from "react";
import styles from "./RTVModal.module.css";
import { useDispatch } from "react-redux";
import { addRTV } from "../../features/orderSlice";
import { toast } from "react-toastify";

const RTVModal = ({ isOpen, onClose, row, username }) => {
  const dispatch = useDispatch();

  const [qty, setQty] = useState("");
  const [rtvDate, setRtvDate] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  useEffect(() => {
    if (row) {
      setQty("");
      setReason("");
      setCustomReason("");
      setRtvDate(new Date().toISOString().split("T")[0]); // today default
    }
  }, [row]);

  if (!isOpen || !row) return null;

  const item = row.ProductTypes?.split(",")[0];
  const weight = row.Weights?.split(",")[0];
  const rate = row.Rates?.split(",")[0];
  const maxQty = row.Quantities?.split(",")[0];

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

    try {
      const payload = {
        OrderID: row.OrderID,
        ItemID: row.ItemIDs?.split(",")[0],
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
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h4>Return To Vendor</h4>
          <button onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label>Item</label>
            <input value={item} disabled />
          </div>

          <div className={styles.field}>
            <label>Weight</label>
            <input value={weight} disabled />
          </div>

          <div className={styles.field}>
            <label>Rate</label>
            <input value={rate} disabled />
          </div>

          <div className={styles.field}>
            <label>Order Qty</label>
            <input value={maxQty} disabled />
          </div>

          <div className={styles.field}>
            <label>RTV Quantity</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Enter return qty"
            />
          </div>

          <div className={styles.field}>
            <label>RTV Date</label>
            <input
              type="date"
              value={rtvDate}
              onChange={(e) => setRtvDate(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label>Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Select reason</option>
              <option value="Customer Return">Customer Return</option>
              <option value="Damage">Damage</option>
              <option value="Expired">Expired</option>
              <option value="Wrong Supply">Wrong Supply</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {reason === "Other" && (
            <div className={styles.field}>
              <label>Custom Reason</label>
              <input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter reason"
              />
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancel} onClick={onClose}>
            Cancel
          </button>

          <button className={styles.submit} onClick={handleSubmit}>
            Submit RTV
          </button>
        </div>
      </div>
    </div>
  );
};

export default RTVModal;
