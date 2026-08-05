import React, { useEffect, useState } from "react";
import styles from "./UpdateNote.module.css";
import { useDispatch } from "react-redux";
import { updateNote, getNotes } from "../../features/noteSlice";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const UpdateNote = ({ note, onClose }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    note_type: "",
    remarks: "",
    freight: 0,
    items: [],
  });

  useEffect(() => {
    if (!note) return;

    setForm({
      note_type: note.note_type || "",
      remarks: note.remarks || "",
      freight: note.freight || 0,
      items: (note.products || []).map((item) => ({
        note_id: item.note_id,
        product_name: item.product_name,
        original_qty: item.original_qty,
        note_qty: item.note_qty,
        rate: item.rate,
        amount: item.amount,
        reason: item.reason || "",
        remarks: item.remarks || "",
        status: item.status || "Active",
      })),
    });
  }, [note]);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];

      items[index][field] = value;

      if (field === "note_qty" || field === "rate") {
        items[index].amount =
          Number(items[index].note_qty || 0) * Number(items[index].rate || 0);
      }

      return {
        ...prev,
        items,
      };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!form.note_type) {
      toast.error("Please select a note type");
      setLoading(false);
      return;
    }

    for (const item of form.items) {
      if (!item.note_qty || Number(item.note_qty) <= 0) {
        toast.error(`Enter valid quantity for ${item.product_name}`);
        setLoading(false);
        return;
      }

      if (!item.rate || Number(item.rate) <= 0) {
        toast.error(`Enter valid rate for ${item.product_name}`);
        setLoading(false);
        return;
      }

      if (!item.amount || Number(item.amount) <= 0) {
        toast.error(`Enter valid amount for ${item.product_name}`);
        setLoading(false);
        return;
      }
    }

    try {
      const result = await dispatch(updateNote(form));

      if (result?.payload?.success !== false) {
        toast.success("✅ Note updated successfully!");
        await dispatch(getNotes());
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        toast.error("❌ Failed to update note. Please try again.");
      }
    } catch (error) {
      toast.error("❌ An error occurred. Please try again.");
      console.error("Update error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!note) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.icon}>📝</span>
            <h2>Edit Credit / Debit Note</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={submit}>
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label>
                <span className={styles.labelIcon}>📋</span> Note Type
                <span className={styles.required}>*</span>
              </label>
              <select
                name="note_type"
                value={form.note_type}
                onChange={handleHeaderChange}
                className={styles.select}
              >
                <option value="">Select Type</option>
                <option value="Credit">💰 Credit</option>
                <option value="Debit">💳 Debit</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Freight</label>

              <input
                type="number"
                name="freight"
                value={form.freight}
                className={styles.input}
                onChange={handleHeaderChange}
              />
            </div>
            {form.items.map((item, index) => (
              <div key={item.note_id} className={styles.productCard}>
                <div className={styles.productHeader}>
                  <div>
                    <h4>{item.product_name}</h4>
                    <small>Original Qty : {item.original_qty}</small>
                  </div>
                </div>

                <div className={styles.grid}>
                  <div className={styles.formGroup}>
                    <label>Quantity</label>
                    <input
                      type="number"
                      value={item.note_qty}
                      className={styles.input}
                      onChange={(e) =>
                        handleItemChange(index, "note_qty", e.target.value)
                      }
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Rate</label>
                    <input
                      type="number"
                      value={item.rate}
                      className={styles.input}
                      onChange={(e) =>
                        handleItemChange(index, "rate", e.target.value)
                      }
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Amount</label>
                    <input
                      type="number"
                      value={item.amount}
                      className={styles.input}
                      onChange={(e) =>
                        handleItemChange(index, "amount", e.target.value)
                      }
                    />
                  </div>

                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label>Reason</label>
                    <textarea
                      rows="2"
                      value={item.reason}
                      className={styles.textarea}
                      onChange={(e) =>
                        handleItemChange(index, "reason", e.target.value)
                      }
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Status</label>
                    <select
                      value={item.status}
                      className={styles.select}
                      onChange={(e) =>
                        handleItemChange(index, "status", e.target.value)
                      }
                    >
                      <option value="Active">Active</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancel}
              onClick={onClose}
              disabled={loading}
            >
              ❌ Cancel
            </button>
            <button className={styles.save} type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Updating...
                </>
              ) : (
                "💾 Update Note"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateNote;
