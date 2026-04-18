import { useState, useEffect } from "react";
import styles from "./RTVModal.module.css";
import { useDispatch } from "react-redux";
import { addRTV } from "../../features/orderSlice";
import { toast } from "react-toastify";
import { FiX, FiPackage, FiCalendar, FiCheckCircle } from "react-icons/fi";

const RTVModal = ({ isOpen, onClose, row, username }) => {
  const dispatch = useDispatch();

  const [rtvDate, setRtvDate] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (row) {
      setSelectedItems([]);
      setReason("");
      setCustomReason("");
      setRtvDate(new Date().toISOString().split("T")[0]);
    }
  }, [row]);

  if (!isOpen || !row) return null;

  // split items
  const items = row.ProductTypes?.split(",") || [];
  const weights = row.Weights?.split(",") || [];
  const rates = row.Rates?.split(",") || [];
  const qtys = row.Quantities?.split(",") || [];
  const itemIds = row.ItemIDs?.split(",") || [];

  // ✅ SELECT ITEM (AUTO FULL QTY)
  const handleSelect = (i) => {
    const exists = selectedItems.find((x) => x.index === i);

    if (exists) {
      setSelectedItems(selectedItems.filter((x) => x.index !== i));
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          index: i,
          ItemID: itemIds[i]?.trim(),
          ProductType: items[i]?.trim(),
          Weight: weights[i]?.trim(),
          Rate: Number(rates[i]),
          Quantity: Number(qtys[i]), // ✅ FULL QTY AUTO
        },
      ]);
    }
  };

  // ✅ SUBMIT
  const handleSubmit = async () => {
    if (!rtvDate) {
      toast.error("Select date");
      return;
    }

    const finalReason = reason === "Other" ? customReason : reason;

    if (!finalReason) {
      toast.error("Select reason");
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("Select at least one item");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        OrderID: row.OrderID,
        RTVDate: rtvDate,
        reason: finalReason,
        username,
        items: selectedItems.map((item) => ({
          ItemID: item.ItemID,
          ProductType: item.ProductType,
          Weight: item.Weight,
          Quantity: item.Quantity,
          Rate: item.Rate,
        })),
      };

      await dispatch(addRTV(payload)).unwrap();

      toast.success("RTV added successfully");
      onClose();
    } catch (err) {
      toast.error(err?.message || "RTV failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* HEADER */}
        <div className={styles.header}>
          <h4>
            <FiPackage /> Return To Vendor
          </h4>
          <button onClick={onClose}>
            <FiX />
          </button>
        </div>

        {/* BODY */}
        <div className={styles.body}>
          {/* ITEMS LIST */}
          <div className={styles.field}>
            <label>Select Items</label>

            {items.map((it, i) => {
              const selected = selectedItems.find((x) => x.index === i);

              return (
                <div key={i} className={styles.itemRow}>
                  <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={() => handleSelect(i)}
                  />

                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>
                      {it.trim()} ({weights[i]})
                    </span>
                    <span className={styles.itemQty}>Qty: {qtys[i]}</span>
                  </div>

                  {selected && (
                    <span className={styles.fullQty}>✔ Full Qty</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* DATE */}
          <div className={styles.field}>
            <label>
              <FiCalendar /> RTV Date
            </label>
            <input
              type="date"
              value={rtvDate}
              onChange={(e) => setRtvDate(e.target.value)}
              className={styles.input}
            />
          </div>

          {/* REASON */}
          <div className={styles.field}>
            <label>Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={styles.select}
            >
              <option value="">Select</option>
              <option value="Damage">Damage</option>
              <option value="Expired">Expired</option>
              <option value="Wrong Supply">Wrong Supply</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {reason === "Other" && (
            <div className={styles.field}>
              <input
                placeholder="Enter custom reason"
                className={styles.input}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* FOOTER */}
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
              "Saving..."
            ) : (
              <>
                <FiCheckCircle /> Submit RTV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RTVModal;
