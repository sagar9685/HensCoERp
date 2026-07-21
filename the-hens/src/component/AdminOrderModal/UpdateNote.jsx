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
    note_qty: "",
    rate: "",
    amount: "",
    reason: "",
    remarks: "",
    status: "Active",
  });

  useEffect(() => {
    if (note) {
      setForm({
        note_type: note.note_type || "",
        note_qty: note.note_qty || "",
        rate: note.rate || "",
        amount: note.amount || "",
        reason: note.reason || "",
        remarks: note.remarks || "",
        status: note.status || "Active",
      });
    }
  }, [note]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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
    if (!form.note_qty || parseFloat(form.note_qty) <= 0) {
      toast.error("Please enter a valid quantity");
      setLoading(false);
      return;
    }
    if (!form.rate || parseFloat(form.rate) <= 0) {
      toast.error("Please enter a valid rate");
      setLoading(false);
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Please enter a valid amount");
      setLoading(false);
      return;
    }

    try {
      const result = await dispatch(
        updateNote({
          id: note.note_id,
          data: form,
        }),
      );

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
                onChange={handleChange}
                className={styles.select}
              >
                <option value="">Select Type</option>
                <option value="Credit">💰 Credit</option>
                <option value="Debit">💳 Debit</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>
                <span className={styles.labelIcon}>🔢</span> Quantity
                <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                name="note_qty"
                value={form.note_qty}
                onChange={handleChange}
                placeholder="Enter quantity"
                className={styles.input}
                min="0"
                step="1"
              />
            </div>

            <div className={styles.formGroup}>
              <label>
                <span className={styles.labelIcon}>💰</span> Rate
                <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                name="rate"
                value={form.rate}
                onChange={handleChange}
                placeholder="Enter rate"
                className={styles.input}
                min="0"
                step="0.01"
              />
            </div>

            <div className={styles.formGroup}>
              <label>
                <span className={styles.labelIcon}>💵</span> Amount
                <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="Enter amount"
                className={styles.input}
                min="0"
                step="0.01"
              />
            </div>

            <div className={`${styles.formGroup} ${styles.full}`}>
              <label>
                <span className={styles.labelIcon}>📝</span> Reason
              </label>
              <textarea
                rows="3"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="Enter reason for this note"
                className={styles.textarea}
              />
            </div>

            <div className={`${styles.formGroup} ${styles.full}`}>
              <label>
                <span className={styles.labelIcon}>💬</span> Remarks
              </label>
              <textarea
                rows="3"
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                placeholder="Enter additional remarks"
                className={styles.textarea}
              />
            </div>

            <div className={`${styles.formGroup} ${styles.half}`}>
              <label>
                <span className={styles.labelIcon}>📊</span> Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className={`${styles.select} ${
                  form.status === "Active"
                    ? styles.statusActive
                    : styles.statusCancelled
                }`}
              >
                <option value="Active">✅ Active</option>
                <option value="Cancelled">❌ Cancelled</option>
              </select>
            </div>
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
