import React, { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import styles from "./NoteModal.module.css";
import { createNote } from "../../features/noteSlice";

const creditReasons = [
  "Damaged During Transport",
  "Short Received",
  "Product Returned",
  "Quality Issue",
  "Wrong Product Delivered",
  "Other",
];

const debitReasons = [
  "Extra Quantity Delivered",
  "Additional Supply",
  "Price Difference",
  "Wrong Invoice",
  "Other",
];

const NoteModal = ({ isOpen, onClose, order }) => {
  console.log(order, "inside note modal");
  const dispatch = useDispatch();
  const authData = JSON.parse(localStorage.getItem("authData"));

  const [noteType, setNoteType] = useState("Credit");

  const initialForm = {
    product: "",
    productType: "",
    originalQty: "",
    noteQty: "",
    rate: "",
    reason: "",
    remarks: "",
  };

  const [form, setForm] = useState(initialForm);

  // Products
  const products = useMemo(() => {
    if (!order) return [];

    const names = order.ProductNames?.split(",") || [];
    const types = order.ProductTypes?.split(",") || [];
    const qty = order.Quantities?.split(",") || [];
    const rates = order.Rates?.split(",") || [];

    return names.map((name, index) => ({
      name: name.trim(),
      type: types[index]?.trim() || "",
      qty: qty[index] || "",
      rate: rates[index] || "",
    }));
  }, [order]);

  if (!isOpen) return null;

  const handleProductChange = (e) => {
    const product = products.find((p) => p.name === e.target.value);

    setForm({
      ...form,
      product: product.name,
      productType: product.type,
      originalQty: product.qty,
      rate: product.rate,
      noteQty: "",
      reason: "",
      remarks: "",
    });
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const amount = (Number(form.noteQty) || 0) * (Number(form.rate) || 0);

  const handleSave = async () => {
    const payload = {
      order_id: order.OrderID,
      invoice_no: order.InvoiceNo,
      customer_id: order.CustomerID,
      customer_name: order.CustomerName,
      product_id: null,
      product_type: form.productType,
      product_name: form.product,
      note_type: noteType,
      original_qty: Number(form.originalQty),
      note_qty: Number(form.noteQty),
      rate: Number(form.rate),
      amount,
      reason: form.reason,
      remarks: form.remarks,
      created_by: authData?.userId,
    };

    try {
      const result = await dispatch(createNote(payload));

      if (createNote.fulfilled.match(result)) {
        alert("Note Created Successfully");
        setForm(initialForm);
        onClose();
      } else {
        alert(result.payload || "Failed to create note");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrapper}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"
                  fill="currentColor"
                />
                <path
                  d="M7 10H17V12H7V10ZM7 14H14V16H7V14Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h2>Create {noteType} Note</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.orderInfo}>
            <div className={styles.orderInfoGrid}>
              <div className={styles.infoItem}>
                <label>Order ID</label>
                <div className={styles.infoValue}>{order?.OrderID || "-"}</div>
              </div>
              <div className={styles.infoItem}>
                <label>Invoice No</label>
                <div className={styles.infoValue}>
                  {order?.InvoiceNo || "-"}
                </div>
              </div>
              <div className={styles.infoItem}>
                <label>Customer</label>
                <div className={styles.infoValue}>
                  {order?.CustomerName || "-"}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.noteTypeSection}>
            <label className={styles.sectionLabel}>Note Type</label>
            <div className={styles.noteTypeGroup}>
              <label
                className={`${styles.noteTypeLabel} ${noteType === "Credit" ? styles.active : ""}`}
              >
                <input
                  type="radio"
                  checked={noteType === "Credit"}
                  onChange={() => setNoteType("Credit")}
                />
                <span className={styles.radioCustom}></span>
                Credit Note
              </label>
              <label
                className={`${styles.noteTypeLabel} ${noteType === "Debit" ? styles.active : ""}`}
              >
                <input
                  type="radio"
                  checked={noteType === "Debit"}
                  onChange={() => setNoteType("Debit")}
                />
                <span className={styles.radioCustom}></span>
                Debit Note
              </label>
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Product</label>
                <select
                  value={form.product}
                  onChange={handleProductChange}
                  className={styles.select}
                >
                  <option value="">Select Product</option>
                  {products.map((item, index) => (
                    <option key={index} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Original Qty</label>
                <input
                  value={form.originalQty}
                  readOnly
                  className={styles.inputReadonly}
                />
              </div>

              <div className={styles.formGroup}>
                <label>{noteType} Qty</label>
                <input
                  type="number"
                  name="noteQty"
                  value={form.noteQty}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Enter quantity"
                  onWheel={(e) => e.target.blur()}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Rate (₹)</label>
                <input
                  type="number"
                  name="rate"
                  value={form.rate}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Enter Rate"
                  onWheel={(e) => e.target.blur()}
                />
              </div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label>Reason</label>
                <select
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="">Select Reason</option>
                  {(noteType === "Credit" ? creditReasons : debitReasons).map(
                    (item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label>Remarks</label>
                <textarea
                  rows="3"
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  className={styles.textarea}
                  placeholder="Add any additional remarks..."
                />
              </div>

              <div className={`${styles.formGroup} ${styles.amountField}`}>
                <label>Amount</label>
                <div className={styles.amountDisplay}>
                  ₹ {amount.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button className={styles.saveBtn} onClick={handleSave}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"
                  fill="currentColor"
                />
              </svg>
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteModal;
