// import React, { useCallback } from 'react';
// import styles from './UserDataTable.module.css';

// const DeliveryManDetailCard = ({
//     selected,
//     clearSelection,
//     manualDenominations,
//     handleNoteCountChange,
//     handleQuickAmount,
//     handleHandover,
//     totalHandoverAmount,
//     DENOMINATIONS
// }) => {
//     const generateFullReport = useCallback(() => {
//         if (!selected) {
//             alert("Please select a delivery man to generate the full report.");
//             return;
//         }

//         let remainingAmount = selected.TotalCash;
//         const breakdown = {};
        
//         DENOMINATIONS.forEach(noteValue => {
//             if (remainingAmount >= noteValue) {
//                 const count = Math.floor(remainingAmount / noteValue);
//                 breakdown[noteValue] = count;
//                 remainingAmount -= count * noteValue;
//             } else {
//                 breakdown[noteValue] = 0;
//             }
//         });

//         const invoiceWindow = window.open('', '_blank', 'width=900,height=1100,scrollbars=yes');
        
//         invoiceWindow.document.write(`
//             <!DOCTYPE html>
//             <html lang="en">
//             <head>
//                 <meta charset="UTF-8">
//                 <meta name="viewport" content="width=device-width, initial-scale=1.0">
//                 <title>HensCo - Cash Report</title>
//                 <style>
//                     /* ... (keep the same CSS styles from original) ... */
//                 </style>
//             </head>
//             <body>
//                 <div class="invoice-container">
//                     <!-- ... (keep the same HTML structure from original) ... -->
//                 </div>
//             </body>
//             </html>
//         `);
        
//         invoiceWindow.document.close();
//     }, [selected, DENOMINATIONS]);

//     return (
//         <div className={styles.detailCard}>
//             <div className={styles.cardHeader}>
//                 <h2 className={styles.cardTitle}>
//                     <span className={styles.cardIcon}>👤</span>
//                     Delivery Man Details
//                 </h2>
//                 {selected && (
//                     <button
//                         className={styles.clearButton}
//                         onClick={clearSelection}
//                     >
//                         ✕ Clear
//                     </button>
//                 )}
//             </div>

//             {!selected ? (
//                 <div className={styles.cardEmpty}>
//                     <div className={styles.emptyIcon}>👉</div>
//                     <p>Select a delivery man to view details</p>
//                     <small>Click on any row in the table</small>
//                 </div>
//             ) : (
//                 <div className={styles.cardBody}>
//                     <div className={styles.profileSection}>
//                         <div className={styles.avatarLarge}>
//                             {selected.Name.split(' ').map(n => n[0]).join('')}
//                         </div>
//                         <div className={styles.profileInfo}>
//                             <h3 className={styles.profileName}>{selected.Name}</h3>
//                             <p className={styles.profileMeta}>ID: #{selected.DeliveryManID}</p>
//                             <p className={styles.profileMeta}>{selected.MobileNo}</p>
//                             <p className={styles.profileMeta}>📍 {selected.Area}</p>
//                         </div>
//                     </div>

//                     <div className={styles.detailGrid}>
//                         <div className={styles.detailItem}>
//                             <span className={styles.detailLabel}>Current Balance</span>
//                             <span className={`${styles.detailValue} ${styles.cashValue}`}>
//                                 ₹{selected.TotalCash.toLocaleString()}
//                             </span>
//                         </div>

//                         <div className={styles.detailItem}>
//                             <span className={styles.detailLabel}>Status</span>
//                             <span className={`${styles.detailValue} ${styles.statusBadge} ${
//                                 selected.TotalCash > 3000 ? styles.highStatus : 
//                                 selected.TotalCash > 1000 ? styles.mediumStatus : 
//                                 styles.lowStatus
//                             }`}>
//                                 {selected.TotalCash > 3000 ? 'High Cash' : 
//                                  selected.TotalCash > 1000 ? 'Medium Cash' : 
//                                  'Low Cash'}
//                             </span>
//                         </div>
//                     </div>

//                     {/* Handover Section */}
//                     <div className={styles.handoverSection}>
//                         <div className={styles.handoverHeader}>
//                             <h4>💰 Cash Handover - Manual Notes</h4>
//                             <div className={styles.quickAmounts}>
//                                 <span>Quick Fill:</span>
//                                 {[25, 50, 75, 100].map(percent => (
//                                     <button
//                                         key={percent}
//                                         className={styles.quickAmountButton}
//                                         onClick={() => handleQuickAmount(percent)}
//                                     >
//                                         {percent}%
//                                     </button>
//                                 ))}
//                             </div>
//                         </div>
                        
//                         {/* MANUAL DENOMINATION INPUTS */}
//                         <div className={styles.denominationsInputGrid}>
//                             {DENOMINATIONS.map((noteValue) => (
//                                 <div key={noteValue} className={styles.denominationInputItem}>
//                                     <label className={styles.noteLabel}>₹{noteValue}</label>
//                                     <input
//                                         type="number"
//                                         min="0"
//                                         step="1"
//                                         placeholder="0"
//                                         className={styles.noteInputField}
//                                         value={manualDenominations[noteValue]}
//                                         onChange={(e) => handleNoteCountChange(noteValue, e.target.value)}
//                                     />
//                                 </div>
//                             ))}
//                         </div>
                        
//                         {/* TOTAL PREVIEW */}
//                         <div className={styles.previewSection}>
//                             <div className={styles.previewRow}>
//                                 <span className={styles.detailLabel}>Current Balance:</span>
//                                 <span className={styles.detailValue}>
//                                     ₹{selected.TotalCash.toLocaleString()}
//                                 </span>
//                             </div>
//                             <div className={styles.previewRow}>
//                                 <span className={styles.detailLabel}>Handover Total (Calculated):</span>
//                                 <span className={styles.deductAmount}>
//                                     - ₹{totalHandoverAmount.toLocaleString()}
//                                 </span>
//                             </div>
//                             <div className={styles.previewRow}>
//                                 <span className={styles.detailLabel}>New Balance:</span>
//                                 <span className={styles.newBalance}>
//                                     ₹{(selected.TotalCash - totalHandoverAmount).toLocaleString()}
//                                 </span>
//                             </div>
//                         </div>

//                         <button
//                             className={styles.handoverButton}
//                             onClick={handleHandover}
//                             disabled={totalHandoverAmount <= 0 || totalHandoverAmount > selected.TotalCash}
//                         >
//                             💸 Confirm Handover (₹{totalHandoverAmount.toLocaleString()})
//                         </button>
//                     </div>

//                     <div className={styles.cardActions}>
//                         <button className={styles.secondaryButton}>
//                             📞 Contact
//                         </button>
//                         <button 
//                             className={styles.secondaryButton} 
//                             onClick={generateFullReport} 
//                             disabled={!selected}
//                             title="Generate a detailed report of the current cash balance and its note breakdown."
//                         >
//                             📊 Full Report
//                         </button>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default DeliveryManDetailCard;