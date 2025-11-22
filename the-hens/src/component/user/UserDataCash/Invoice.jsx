import React from "react";
import styles from "./Invoice.module.css";

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export default function Invoice({ selected, manualDenominations, totalHandoverAmount, onClose }) {
    if (!selected) return null;

    return (
        <div className={styles.invoiceWrapper}>
            <div className={styles.invoiceCard}>
                
                {/* Header */}
                <div className={styles.header}>
                    <h2>🧾 Cash Handover Invoice</h2>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Details Section */}
                <div className={styles.section}>
                    <h3>Delivery Man Details</h3>
                    <p><strong>Name:</strong> {selected.Name}</p>
                    <p><strong>ID:</strong> #{selected.DeliveryManID}</p>
                    <p><strong>Phone:</strong> {selected.MobileNo}</p>
                    <p><strong>Area:</strong> {selected.Area}</p>
                </div>

                {/* Notes Breakdown */}
                <div className={styles.section}>
                    <h3>Denomination Breakdown</h3>
                    
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Note</th>
                                <th>Qty</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {DENOMINATIONS.map((note, idx) => {
                                const qty = Number(manualDenominations[note] || 0);
                                if (qty === 0) return null;

                                return (
                                    <tr key={note}>
                                        <td>{idx + 1}</td>
                                        <td>₹{note}</td>
                                        <td>{qty}</td>
                                        <td>₹{(note * qty).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Total Section */}
                <div className={styles.section}>
                    <h3>Totals</h3>
                    <div className={styles.totalRow}>
                        <span>Total Handover Amount:</span>
                        <strong>₹{totalHandoverAmount.toLocaleString()}</strong>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.printBtn} onClick={() => window.print()}>
                        🖨️ Print Invoice
                    </button>
                </div>
            </div>
        </div>
    );
}
