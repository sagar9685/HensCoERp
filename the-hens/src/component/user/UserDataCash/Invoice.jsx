import React from "react";
import styles from "./Invoice.module.css";

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export default function Invoice({ selected, manualDenominations, totalHandoverAmount, onClose }) {
    if (!selected) return null;

    const handlePrint = () => {
        // Create a hidden iframe for printing
        const printIframe = document.createElement('iframe');
        printIframe.style.position = 'absolute';
        printIframe.style.width = '0';
        printIframe.style.height = '0';
        printIframe.style.border = '0';
        document.body.appendChild(printIframe);
        
        const printDoc = printIframe.contentWindow.document;
        
        // Get current date and time
        const now = new Date();
        const dateStr = now.toLocaleDateString();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Calculate totals for each denomination
        let denominationsHtml = '';
        let rowCount = 0;
        DENOMINATIONS.forEach((note) => {
            const qty = Number(manualDenominations[note] || 0);
            if (qty > 0) {
                rowCount++;
                denominationsHtml += `
                    <tr>
                        <td style="padding: 4px 6px; border-bottom: 1px solid #ddd; font-size: 12px;">${rowCount}</td>
                        <td style="padding: 4px 6px; border-bottom: 1px solid #ddd; font-size: 12px; text-align: right;">₹${note}</td>
                        <td style="padding: 4px 6px; border-bottom: 1px solid #ddd; font-size: 12px; text-align: center;">${qty}</td>
                        <td style="padding: 4px 6px; border-bottom: 1px solid #ddd; font-size: 12px; text-align: right;">₹${(note * qty).toLocaleString()}</td>
                    </tr>
                `;
            }
        });

        // Number to words function
        const numberToWords = (num) => {
            const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
            const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
            const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
            
            if (num === 0) return 'Zero Rupees Only';
            
            let words = '';
            
            // Handle thousands
            if (num >= 1000) {
                const thousands = Math.floor(num / 1000);
                if (thousands >= 100) {
                    words += numberToWords(thousands);
                } else if (thousands >= 20) {
                    words += tens[Math.floor(thousands / 10)] + ' ';
                    if (thousands % 10 > 0) words += ones[thousands % 10] + ' ';
                } else if (thousands >= 10) {
                    words += teens[thousands - 10] + ' ';
                } else if (thousands > 0) {
                    words += ones[thousands] + ' ';
                }
                words += 'Thousand ';
                num %= 1000;
            }
            
            // Handle hundreds
            if (num >= 100) {
                words += ones[Math.floor(num / 100)] + ' Hundred ';
                num %= 100;
            }
            
            // Handle tens and ones
            if (num >= 20) {
                words += tens[Math.floor(num / 10)] + ' ';
                num %= 10;
            } else if (num >= 10) {
                words += teens[num - 10] + ' ';
                num = 0;
            }
            
            if (num > 0) {
                words += ones[num] + ' ';
            }
            
            return words.trim() + ' Rupees Only';
        };

        // Write the HTML for printing
        printDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cash Handover </title>
                <meta charset="UTF-8">
                <style>
                    @page {
                        size: A4;
                         margin: 15mm 15mm 15mm 15mm;
                    }
                    
                    body {
                        font-family: 'Arial', sans-serif;
                        margin: 0;
                        padding: 15px;
                        color: #000;
                        background: white;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                        width: 100%;
                        
                    }
                    
                    .invoice-box {
                         width: 100%;
    max-width: 700px;          /* reduced for clean margins */
    margin: 0 auto;            /* center page */
    padding: 20px 25px;        /* inner spacing */
    border: 1px solid #000;
    background: #fff;
    box-sizing: border-box;
                    }
                    
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 10px;
                        margin-bottom: 15px;
                    }
                    
                    .header h1 {
                        font-size: 22px;
                        margin: 0 0 5px 0;
                        color: #000;
                    }
                    
                    .invoice-info {
                        display: flex;
                        justify-content: space-between;
                        font-size: 12px;
                        margin-bottom: 10px;
                    }
                    
                    .details-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 8px;
                        margin-bottom: 15px;
                        font-size: 13px;
                    }
                    
                    .details-grid > div {
                        margin: 3px 0;
                    }
                    
                    .details-grid strong {
                        font-weight: bold;
                        display: inline-block;
                        width: 70px;
                    }
                    
                    .table-container {
                        margin: 15px 0;
                    }
                    
                    .table-header {
                        font-size: 14px;
                        font-weight: bold;
                        margin: 10px 0 5px 0;
                        border-bottom: 1px solid #000;
                        padding-bottom: 5px;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 12px;
                        margin-bottom: 10px;
                    }
                    
                    th {
                        background-color: #f2f2f2 !important;
                        color: #000;
                        font-weight: bold;
                        padding: 8px;
                        text-align: left;
                        border: 1px solid #000;
                    }
                    
                    td {
                        padding: 6px 8px;
                        border: 1px solid #ddd;
                    }
                    
                    .total-section {
                        border: 2px solid #000;
                        padding: 15px;
                        margin-top: 15px;
                        background-color: #f9f9f9;
                    }
                    
                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: 16px;
                        font-weight: bold;
                        margin: 8px 0;
                    }
                    
                    .amount-in-words {
                        font-size: 12px;
                        font-style: italic;
                        margin-top: 10px;
                        padding: 8px;
                        background-color: #f5f5f5;
                        border: 1px dashed #666;
                    }
                    
                    .signatures {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 25px;
                        padding-top: 20px;
                        border-top: 1px solid #000;
                    }
                    
                    .signature-box {
                        width: 200px;
                        text-align: center;
                    }
                    
                    .signature-line {
                        border-top: 1px solid #000;
                        margin-top: 40px;
                        padding-top: 5px;
                        font-size: 12px;
                    }
                    
                    .footer {
                        margin-top: 15px;
                        font-size: 10px;
                        text-align: center;
                        color: #666;
                        border-top: 1px dashed #666;
                        padding-top: 10px;
                    }
                    
                    @media print {
                        .no-print {
                            display: none !important;
                        }
                            body {
                            background-color: white !important;
                        }
                       
                        @page {
                            margin: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <div class="header">
                        <h1>CASH HANDOVER </h1>
                        <div class="invoice-info">
                            <div><strong>Date:</strong> ${dateStr}</div>
                            <div><strong>Time:</strong> ${timeStr}</div>
                           
                        </div>
                    </div>
                    
                    <div class="details-grid">
                        <div><strong>Name:</strong> ${selected.Name}</div>
                        <div><strong>ID:</strong> #${selected.DeliveryManID}</div>
                        <div><strong>Phone:</strong> ${selected.MobileNo}</div>
                        <div><strong>Area:</strong> ${selected.Area}</div>
                    </div>
                    
                    <div class="table-header">DENOMINATION BREAKDOWN</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 10%">S.No</th>
                                <th style="width: 20%; text-align: right;">Note</th>
                                <th style="width: 20%; text-align: center;">Quantity</th>
                                <th style="width: 25%; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${denominationsHtml}
                        </tbody>
                    </table>
                    
                    <div class="total-section">
                        <div class="total-row">
                            <span>Total Handover Amount:</span>
                            <span style="font-size: 20px; color: #000;">₹${totalHandoverAmount.toLocaleString()}</span>
                        </div>
                        <div class="amount-in-words">
                            <strong>Amount in Words:</strong> ${numberToWords(totalHandoverAmount)}
                        </div>
                    </div>
                    
                    <div class="signatures">
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div>Delivery Person Signature</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div>Authorized Signatory</div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        This is a computer generated invoice. No signature required.<br>
                        For any queries, please contact sagargupta12396@gmail.com
                    </div>
                </div>
            </body>
            </html>
        `);
        
        printDoc.close();
        
        // Wait for content to load, then print
        printIframe.onload = function() {
            setTimeout(() => {
                printIframe.contentWindow.focus();
                printIframe.contentWindow.print();
                
                // Remove iframe after printing
                setTimeout(() => {
                    document.body.removeChild(printIframe);
                }, 100);
            }, 250);
        };
    };

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
                    <div className={styles.detailsGrid}>
                        <div><strong>Name:</strong> {selected.Name}</div>
                        <div><strong>ID:</strong> #{selected.DeliveryManID}</div>
                        <div><strong>Phone:</strong> {selected.MobileNo}</div>
                        <div><strong>Area:</strong> {selected.Area}</div>
                    </div>
                </div>

                {/* Notes Breakdown */}
                <div className={styles.section}>
                    <h3>Denomination Breakdown</h3>
                    
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{width: '15%'}}>S.No</th>
                                <th style={{width: '25%', textAlign: 'right'}}>Note</th>
                                <th style={{width: '25%', textAlign: 'center'}}>Qty</th>
                                <th style={{width: '35%', textAlign: 'right'}}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {DENOMINATIONS.map((note, idx) => {
                                const qty = Number(manualDenominations[note] || 0);
                                if (qty === 0) return null;

                                return (
                                    <tr key={note}>
                                        <td>{idx + 1}</td>
                                        <td style={{textAlign: 'right'}}>₹{note}</td>
                                        <td style={{textAlign: 'center'}}>{qty}</td>
                                        <td style={{textAlign: 'right'}}>₹{(note * qty).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Total Section */}
                <div className={`${styles.section} ${styles.totalSection}`}>
                    <h3>Totals</h3>
                    <div className={styles.totalRow}>
                        <span>Total Handover Amount:</span>
                        <strong>₹{totalHandoverAmount.toLocaleString()}</strong>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.printBtn} onClick={handlePrint}>
                        🖨️ Print Invoice
                    </button>
                </div>
            </div>
        </div>
    );
}