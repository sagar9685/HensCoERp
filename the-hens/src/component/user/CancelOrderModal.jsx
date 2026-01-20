import { useState } from "react";
import styles from "./CancelOrderModal.module.css";

const CancelOrderModal = ({ isOpen, onClose, onSubmit, order }) => {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3>Cancel Order #{order?.OrderID}</h3>

        <textarea
          placeholder="Cancel reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className={styles.modalFooter}>
          <button onClick={onClose}>Close</button>
          <button onClick={() => onSubmit(reason)}>
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelOrderModal;
