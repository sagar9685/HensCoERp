import React from "react";
import styles from "./UserDataTable.module.css";
import { DENOMINATIONS, handoverCash } from "../../../features/denominationSlice";
import { useDispatch, useSelector } from "react-redux";

export default function DeliveryManDetails({ 
    selected, 
    manualDenominations, 
    totalHandoverAmount,
    onNoteCountChange,
    onQuickAmount,
    onClearSelection,
    onGenerateInvoice
}) {
    const dispatch = useDispatch();
    const { loading: dLoading, success, error } = useSelector((state) => state.denomination);

const handleHandover = () => {
  if (!selected || totalHandoverAmount <= 0) return;

const denominationsToSend = {};
DENOMINATIONS.forEach(note => {
  const count = manualDenominations[note];
  if (count && count > 0) denominationsToSend[note] = Number(count);
});


  const payload = {
  deliveryManId: selected.DeliveryManID,
  totalHandoverAmount: totalHandoverAmount,
  denominationJSON: denominationsToSend,
  orderPaymentIds: []
};




 


  dispatch(handoverCash(payload));
};

    if (!selected) {
        return (
            <div className={styles.detailCard}>
                <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                        <span className={styles.cardIcon}>👤</span>
                        Delivery Man Details
                    </h2>
                </div>
                <div className={styles.cardEmpty}>
                    <div className={styles.emptyIcon}>👉</div>
                    <p>Select a delivery man to view details</p>
                    <small>Click on any row in the table</small>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.detailCard}>
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                    <span className={styles.cardIcon}>👤</span>
                    Delivery Man Details
                </h2>
                <button
                    className={styles.clearButton}
                    onClick={onClearSelection}
                >
                    ✕ Clear
                </button>
            </div>

            <div className={styles.cardBody}>
                {/* PROFILE SECTION */}
                <div className={styles.profileSection}>
                    <div className={styles.avatarLarge}>
                        {selected.Name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className={styles.profileInfo}>
                        <h3 className={styles.profileName}>{selected.Name}</h3>
                        <p className={styles.profileMeta}>ID: #{selected.DeliveryManID}</p>
                        <p className={styles.profileMeta}>{selected.MobileNo}</p>
                        <p className={styles.profileMeta}>📍 {selected.Area}</p>
                    </div>
                </div>

                {/* BALANCE & STATUS */}
                <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Current Balance</span>
                        <span className={`${styles.detailValue} ${styles.cashValue}`}>
                            ₹{selected.TotalCash.toLocaleString()}
                        </span>
                    </div>
                    <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Status</span>
                        <span className={`${styles.detailValue} ${styles.statusBadge} ${
                            selected.TotalCash > 3000 ? styles.highStatus : 
                            selected.TotalCash > 1000 ? styles.mediumStatus : 
                            styles.lowStatus
                        }`}>
                            {selected.TotalCash > 3000 ? 'High Cash' : 
                             selected.TotalCash > 1000 ? 'Medium Cash' : 
                             'Low Cash'}
                        </span>
                    </div>
                </div>

                {/* HANDOVER SECTION */}
                <div className={styles.handoverSection}>
                    <div className={styles.handoverHeader}>
                        <h4>💰 Cash Handover - Manual Notes</h4>
                        <div className={styles.quickAmounts}>
                            <span>Quick Fill:</span>
                            {[25, 50, 75, 100].map(percent => (
                                <button
                                    key={percent}
                                    className={styles.quickAmountButton}
                                    onClick={() => onQuickAmount(percent)}
                                >
                                    {percent}%
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* MANUAL DENOMINATIONS */}
                    <div className={styles.denominationsInputGrid}>
                        {DENOMINATIONS.map((noteValue) => (
                            <div key={noteValue} className={styles.denominationInputItem}>
                                <label className={styles.noteLabel}>₹{noteValue}</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="0"
                                    className={styles.noteInputField}
                                    value={manualDenominations[noteValue]}
                                    onChange={(e) => onNoteCountChange(noteValue, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>

                    {/* TOTAL PREVIEW */}
                    <div className={styles.previewSection}>
                        <div className={styles.previewRow}>
                            <span className={styles.detailLabel}>Current Balance:</span>
                            <span className={styles.detailValue}>
                                ₹{selected.TotalCash.toLocaleString()}
                            </span>
                        </div>
                        <div className={styles.previewRow}>
                            <span className={styles.detailLabel}>Handover Total (Calculated):</span>
                            <span className={styles.deductAmount}>
                                - ₹{totalHandoverAmount.toLocaleString()}
                            </span>
                        </div>
                        <div className={styles.previewRow}>
                            <span className={styles.detailLabel}>New Balance:</span>
                            <span className={styles.newBalance}>
                                ₹{(selected.TotalCash - totalHandoverAmount).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* HANDOVER BUTTON */}
                    <button
                        className={styles.handoverButton}
                        onClick={handleHandover}
                        disabled={dLoading || totalHandoverAmount <= 0}
                    >
                        {dLoading ? "Processing..." : `💸 Confirm Handover (₹${totalHandoverAmount})`}
                    </button>

                    {/* SUCCESS & ERROR MESSAGES */}
                    {success && <p className={styles.successMsg}>{success}</p>}
                    {error && <p className={styles.errorMsg}>{error}</p>}
                </div>

                {/* ACTIONS */}
                <div className={styles.cardActions}>
                    <button className={styles.secondaryButton}>
                        📞 Contact
                    </button>
                    <button
                        className={styles.generateInvoiceButton}
                        onClick={() => onGenerateInvoice()}
                        disabled={totalHandoverAmount <= 0}
                    >
                        🧾 Generate Invoice
                    </button>
                </div>
            </div>
        </div>
    );
}
