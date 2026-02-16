import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateOrderQuantity } from "../../features/orderSlice";
import styles from "./UpdateQuantityModal.module.css";
import { toast } from "react-toastify";

const UpdateQuantityModal = ({ isOpen, onClose, row }) => {
  const dispatch = useDispatch();

  // Retrieve current user from Redux state
  const currentUser = useSelector(
    (state) =>
      state.auth?.data?.Username ||
      state.auth?.data?.name ||
      state.auth?.data?.user?.name ||
      "Admin",
  );

  const [changes, setChanges] = useState({});
  const [reason, setReason] = useState("");

  // Reset local state when the modal opens or the selected row changes
  useEffect(() => {
    setChanges({});
    setReason("");
  }, [row, isOpen]);

  if (!isOpen || !row) return null;

  // Data parsing (converting comma-separated strings from DB to arrays)
  const itemIds = row?.ItemIDs?.split(",").map((i) => i.trim()) || [];
  const productNames = row?.ProductNames?.split(",").map((p) => p.trim()) || [];
  const originalQuantities =
    row?.Quantities?.split(",").map((q) => Number(q.trim())) || [];
  const rates = row?.Rates?.split(",").map((r) => Number(r.trim())) || [];
  const productTypes = row?.ProductTypes?.split(",").map((t) => t.trim()) || [];

  const handleQtyChange = (itemId, val) => {
    setChanges((prev) => ({
      ...prev,
      [itemId]: val,
    }));
  };

  const handleSubmit = async () => {
    const itemsToUpdate = Object.keys(changes).filter(
      (id) => changes[id] !== "" && changes[id] !== null,
    );

    // Validation: Check if any changes were actually made
    if (itemsToUpdate.length === 0) {
      toast.warning("Please change at least one quantity.");
      return;
    }

    // Validation: Reason is mandatory
    if (!reason.trim()) {
      toast.error("Reason for update is mandatory!");
      return;
    }

    try {
      const updatePromises = itemsToUpdate.map((itemId) =>
        dispatch(
          updateOrderQuantity({
            orderId: row.OrderID,
            itemId: itemId,
            newQuantity: Number(changes[itemId]),
            changedBy: currentUser,
            reason: reason.trim(),
          }),
        ).unwrap(),
      );

      await Promise.all(updatePromises);
      toast.success("All items updated successfully!");
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to update order.");
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Update Quantities (Order #{row.OrderID})</h3>
          <button className={styles.closeX} onClick={onClose}>
            &times;
          </button>
        </div>

        {/* --- Customer & Contact Details --- */}
        <div className={styles.customerInfo}>
          <div className={styles.infoBox}>
            <strong>Customer:</strong> <span>{row.CustomerName}</span>
          </div>
          <div className={styles.infoBox}>
            <strong>Mobile:</strong> <span>{row.ContactNo || "N/A"}</span>
          </div>
          <div className={styles.infoBox}>
            <strong>Area:</strong> <span>{row.Area || "N/A"}</span>
          </div>
          <div className={styles.infoBox}>
            <strong>Updated By:</strong>{" "}
            <span className={styles.userBadge}>{currentUser}</span>
          </div>
        </div>

        <hr className={styles.divider} />

        {/* --- Items Table --- */}
        <div className={styles.tableContainer}>
          <table className={styles.itemTable}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Rate</th>
                <th>Current Qty</th>
                <th>New Qty</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {productNames.map((name, index) => {
                const id = itemIds[index];
                const rate = rates[index] || 0;
                const currentQty = originalQuantities[index] || 0;
                const type = productTypes[index] || "-";

                // Calculate subtotal based on new input or original quantity
                const newQty =
                  changes[id] !== undefined && changes[id] !== ""
                    ? Number(changes[id])
                    : currentQty;
                const rowTotal = rate * newQty;

                return (
                  <tr key={id}>
                    <td>
                      <strong>{name}</strong>
                    </td>
                    <td>
                      <span className={styles.typeBadge}>{type}</span>
                    </td>
                    <td>₹{rate}</td>
                    <td>{currentQty}</td>
                    <td>
                      <input
                        type="number"
                        className={styles.smallInput}
                        value={changes[id] || ""}
                        placeholder={currentQty}
                        onChange={(e) => handleQtyChange(id, e.target.value)}
                      />
                    </td>
                    <td className={styles.rowTotal}>
                      ₹{rowTotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* --- Reason Field (Mandatory) --- */}
        <div className={styles.footerSection}>
          <label className={styles.label}>
            Reason for Update <span className={styles.required}>*</span>
          </label>
          <textarea
            placeholder="Why are you changing these quantities? (e.g., Customer request)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`${styles.textarea} ${
              !reason.trim() ? styles.errorBorder : ""
            }`}
          />

          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={onClose}>
              Discard
            </button>
            <button className={styles.saveBtn} onClick={handleSubmit}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateQuantityModal;
