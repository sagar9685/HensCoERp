import React, { useEffect } from "react";
import {
  FaTimes,
  FaFileInvoice,
  FaUser,
  FaBox,
  FaCalendarAlt,
  FaBalanceScale,
  FaArrowDown,
  FaArrowUp,
  FaStickyNote,
  FaTag,
} from "react-icons/fa";
import styles from "./NoteViewModal.module.css";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const NoteViewModal = ({ note, onClose }) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!note) return null;

  const isCredit = note.note_type === "Credit";

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <h2>{note.note_type || "Credit / Debit"} Note</h2>
            <span className={styles.noteNo}>{note.note_no || "N/A"}</span>
          </div>

          <div className={styles.headerRight}>
            <div
              className={`${styles.badge} ${isCredit ? styles.credit : styles.debit}`}
            >
              {isCredit ? <FaArrowDown /> : <FaArrowUp />}
              <span>{note.note_type || "Note"}</span>
            </div>
            <button
              className={styles.closeIconBtn}
              onClick={onClose}
              aria-label="Close modal"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Highlighted Hero Card */}
        <div className={styles.heroCard}>
          <div className={styles.heroItem}>
            <span className={styles.heroLabel}>Total Amount</span>
            <span
              className={`${styles.heroValue} ${isCredit ? styles.creditText : styles.debitText}`}
            >
              {formatCurrency(note.amount)}
            </span>
          </div>
          <div className={styles.heroDivider} />
          <div className={styles.heroItem}>
            <span className={styles.heroLabel}>Created Date</span>
            <span className={styles.heroSubValue}>
              {formatDate(note.created_at)}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className={styles.grid}>
          <div className={styles.field}>
            <FaFileInvoice className={styles.icon} />
            <div>
              <label>Invoice No</label>
              <p>{note.InvoiceNo || "N/A"}</p>
            </div>
          </div>

          <div className={styles.field}>
            <FaUser className={styles.icon} />
            <div>
              <label>Customer</label>
              <p>{note.CustomerName || "N/A"}</p>
            </div>
          </div>

          <div className={styles.field}>
            <FaBox className={styles.icon} />
            <div>
              <label>Product</label>
              <p>{note.product_name || "N/A"}</p>
            </div>
          </div>

          <div className={styles.field}>
            <FaTag className={styles.icon} />
            <div>
              <label>Product Type</label>
              <p>{note.product_type || "N/A"}</p>
            </div>
          </div>

          <div className={styles.field}>
            <FaBalanceScale className={styles.icon} />
            <div>
              <label>Quantity</label>
              <p>{note.note_qty ?? "0"}</p>
            </div>
          </div>

          <div className={styles.field}>
            <FaBalanceScale className={styles.icon} />
            <div>
              <label>Rate</label>
              <p>{formatCurrency(note.rate)}</p>
            </div>
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <FaStickyNote className={styles.icon} />
            <div>
              <label>Reason</label>
              <p className={styles.reasonText}>
                {note.reason || "No reason provided."}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.closeBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteViewModal;
