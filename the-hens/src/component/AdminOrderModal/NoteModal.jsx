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
  const dispatch = useDispatch();
  const authData = JSON.parse(localStorage.getItem("authData") || "{}");

  const [noteType, setNoteType] = useState("Credit");

  const today = new Date().toISOString().split("T")[0];
  const [noteDate, setNoteDate] = useState(today);

  const initialItem = {
    product: "",
    productType: "",
    originalQty: "",
    noteQty: "",
    rate: "",
    reason: "",
    remarks: "",
    freight: "",
  };

  const [items, setItems] = useState([{ ...initialItem }]);

  const products = useMemo(() => {
    if (!order) return [];

    const names = order.ProductTypes?.split(",") || [];
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

  const handleProductChange = (index, value) => {
    const product = products.find((p) => p.name === value);
    if (!product) return;

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      product: product.name,
      productType: product.type,
      originalQty: product.qty,
      rate: product.rate,
    };
    setItems(updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([...items, { ...initialItem }]);
  };

  const handleRemoveItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const totalAmount = items.reduce((sum, item) => {
    return (
      sum +
      Number(item.noteQty || 0) * Number(item.rate || 0) +
      Number(item.freight || 0)
    );
  }, 0);

  const handleSave = async () => {
    const payload = {
      order_id: order?.OrderID,
      invoice_no: order?.InvoiceNo,
      customer_id: order?.CustomerID,
      customer_name: order?.CustomerName,
      note_type: noteType,
      note_date: noteDate,
      created_by: authData?.userId,

      items: items.map((item) => ({
        product_id: null,
        product_name: item.product,
        product_type: item.productType,
        original_qty: Number(item.originalQty),
        note_qty: Number(item.noteQty),
        rate: Number(item.rate),
        freight: Number(item.freight),
        amount:
          Number(item.noteQty || 0) * Number(item.rate || 0) +
          Number(item.freight || 0),
        reason: item.reason,
        remarks: item.remarks,
      })),
    };

    try {
      const result = await dispatch(createNote(payload));

      if (createNote.fulfilled.match(result)) {
        alert("Note Created Successfully");
        setItems([{ ...initialItem }]);
        setNoteDate(today);
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
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrapper}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
            <div>
              <h2>Create {noteType} Note</h2>
              <p className={styles.subtitle}>
                Manage adjustments for order items
              </p>
            </div>
          </div>

          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.body}>
          {/* Order Info Summary Card */}
          <div className={styles.orderInfo}>
            <div className={styles.orderInfoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Order ID</span>
                <span className={styles.infoValue}>
                  {order?.OrderID || "-"}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Invoice No</span>
                <span className={styles.infoValue}>
                  {order?.InvoiceNo || "-"}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Customer</span>
                <span className={styles.infoValue}>
                  {order?.CustomerName || "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Configuration Row */}
          <div className={styles.configRow}>
            <div className={styles.noteTypeSection}>
              <label className={styles.sectionLabel}>Note Type</label>
              <div className={styles.noteTypeGroup}>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${noteType === "Credit" ? styles.activeCredit : ""}`}
                  onClick={() => setNoteType("Credit")}
                >
                  Credit Note
                </button>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${noteType === "Debit" ? styles.activeDebit : ""}`}
                  onClick={() => setNoteType("Debit")}
                >
                  Debit Note
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.sectionLabel}>Note Date</label>
              <input
                type="date"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          {/* Items Section */}
          <div className={styles.itemsContainer}>
            {items.map((item, index) => {
              const itemAmount =
                Number(item.noteQty || 0) * Number(item.rate || 0) +
                Number(item.freight || 0);

              return (
                <div key={index} className={styles.formSection}>
                  <div className={styles.itemHeader}>
                    <h4>Item #{index + 1}</h4>
                    {items.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeItemBtn}
                        onClick={() => handleRemoveItem(index)}
                      >
                        Remove Item
                      </button>
                    )}
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Product</label>
                      <select
                        value={item.product}
                        onChange={(e) =>
                          handleProductChange(index, e.target.value)
                        }
                        className={styles.select}
                      >
                        <option value="">Select Product</option>
                        {products.map((p, i) => (
                          <option key={i} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Original Qty</label>
                      <input
                        value={item.originalQty}
                        readOnly
                        className={styles.inputReadonly}
                        placeholder="Auto"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>{noteType} Qty</label>
                      <input
                        type="number"
                        value={item.noteQty}
                        onChange={(e) =>
                          handleItemChange(index, "noteQty", e.target.value)
                        }
                        className={styles.input}
                        placeholder="0"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Rate (₹)</label>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) =>
                          handleItemChange(index, "rate", e.target.value)
                        }
                        className={styles.input}
                        placeholder="0.00"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Freight (₹)</label>
                      <input
                        type="number"
                        value={item.freight}
                        onChange={(e) =>
                          handleItemChange(index, "freight", e.target.value)
                        }
                        className={styles.input}
                        placeholder="0.00"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Reason</label>
                      <select
                        value={item.reason}
                        onChange={(e) =>
                          handleItemChange(index, "reason", e.target.value)
                        }
                        className={styles.select}
                      >
                        <option value="">Select Reason</option>
                        {(noteType === "Credit"
                          ? creditReasons
                          : debitReasons
                        ).map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                      <label>Remarks</label>
                      <textarea
                        rows={2}
                        value={item.remarks}
                        onChange={(e) =>
                          handleItemChange(index, "remarks", e.target.value)
                        }
                        className={styles.textarea}
                        placeholder="Add any additional notes here..."
                      />
                    </div>

                    <div className={styles.amountDisplayCard}>
                      <span>Item Total Amount</span>
                      <span className={styles.itemAmountVal}>
                        ₹ {itemAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              className={styles.addItemBtn}
              onClick={handleAddItem}
            >
              + Add Another Item
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.totalSection}>
            <span className={styles.totalLabel}>Total Amount</span>
            <span className={styles.totalValue}>
              ₹ {totalAmount.toFixed(2)}
            </span>
          </div>

          <div className={styles.footerButtons}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleSave}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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
