// InvoiceGenerator.js
import React, { useRef } from "react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import styles from './invoice.module.css';
import { FaDownload, FaPrint, FaTimes, FaFileInvoice } from "react-icons/fa";

// Company Constants
const COMPANY_INFO = {
  name: "VND VENTURES PRIVATE LIMITED",
  brand: "The Hen's Co.",
  pan: "AAGCV7020A",
  cin: "U15549MP2018PTC047189",
  gstin: "23AAGCV7020A1ZX",
  address: "201/15, Ratan Colony, Gorakhpur, Jabalpur, Madhya Pradesh 482001",
  contactPerson: "Shubham Sahu",
  phone: "9685043467",
  bankDetails: {
    accountName: "VND VENTURES PRIVATE LIMITED",
    accountNumber: "940520110000347",
    bankName: "Bank of India",
    ifscCode: "BKID0009405"
  },
  hsnCode: "04072100"
};

const TERMS_CONDITIONS = [
  "Any claim for shortage or damage must be raised at the time of delivery only.",
  "The supplier shall not be liable for any damage, spoilage, or loss occurring after acceptance by the purchase Party.",
  "Payment terms as per the Bill.",
  "All taxes, duties, and levies as applicable will be charged extra.",
  "The company shall not be held responsible for any health consequences resulting from the consumer's negligence in using eggs or egg-related products after the 'best before' or 'use by' date displayed on the packaging.",
  "The company shall not be held responsible for any side effects or allergic reactions resulting from the consumption of eggs or egg-related products.",
  "The company shall not be liable for any health issues, allergies, or other conditions arising from the consumption or misuse of eggs or related products of the company.",
  "All disputes are subject to Jabalpur jurisdiction only."
];

// Utility function to safely calculate product totals
const calculateProductTotals = (row) => {
    const names = row.ProductNames ? row.ProductNames.split(",").map(s => s.trim()) : [];
    const types = row.ProductTypes ? row.ProductTypes.split(",").map(s => s.trim()) : [];
    const weights = row.Weights ? row.Weights.split(",").map(s => s.trim()) : [];
    const quantities = row.Quantities ? row.Quantities.split(",").map(Number) : [];
    const rates = row.Rates ? row.Rates.split(",").map(Number) : [];
   

    const productItems = names.map((name, i) => {
        const qty = quantities[i] || 0;
        const rate = rates[i] || 0;
        const total = qty * rate;

        return {
            hsn: COMPANY_INFO.hsnCode,
            productName: `${name} ${types[i] ? `(${types[i]})` : ''} ${weights[i] || ''}`.trim(),
            gstRate: 0, // Agriculture products have 0% GST
            taxableValue: total.toFixed(2),
            cgst: "0.00",
            sgst: "0.00",
            rate: rate.toFixed(2),
            qty: qty,
            marginAmt: (total * 0.1).toFixed(2), // 10% margin
            totalAmt: total.toFixed(2)
        };
    });

    const subTotal = productItems.reduce((acc, item) => acc + Number(item.totalAmt), 0);
    const deliveryCharge = row.DeliveryCharge ? Number(row.DeliveryCharge) : 0;
    const totalAmount = subTotal + deliveryCharge;

    return {
        productItems,
        subTotal: subTotal.toFixed(2),
        deliveryCharge: deliveryCharge.toFixed(2),
        totalTaxableValue: subTotal.toFixed(2),
        totalCGST: "0.00",
        totalSGST: "0.00",
        totalMargin: productItems.reduce((acc, item) => acc + Number(item.marginAmt), 0).toFixed(2),
        totalAmount: totalAmount.toFixed(2),
    };
};



const InvoiceGenerator = ({ orderData, onClose }) => {
    const invoiceRef = useRef();
    
    if (!orderData) return null;

    const { 
        productItems,
        subTotal,
        deliveryCharge, 
        totalAmount 
    } = calculateProductTotals(orderData);

    const downloadPdf = async () => {
        const input = invoiceRef.current;
        
        // Create a temporary clone for PDF generation
        const tempElement = document.createElement('div');
        tempElement.style.width = '210mm'; // A4 width
        tempElement.style.padding = '15mm';
        tempElement.style.background = 'white';
        tempElement.style.fontFamily = "'Inter', sans-serif";
        tempElement.style.fontSize = '10px';
        tempElement.innerHTML = document.getElementById('invoice-print-content').innerHTML;
        document.body.appendChild(tempElement);

        try {
            const canvas = await html2canvas(tempElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: tempElement.scrollWidth,
                height: tempElement.scrollHeight,
                windowWidth: tempElement.scrollWidth,
                windowHeight: tempElement.scrollHeight,
                onclone: (clonedDoc) => {
                    // Ensure all styles are applied for PDF
                    const clonedElement = clonedDoc.querySelector('div');
                    if (clonedElement) {
                        clonedElement.style.width = '210mm';
                        clonedElement.style.padding = '15mm';
                        clonedElement.style.background = 'white';
                        clonedElement.style.fontFamily = "'Inter', sans-serif";
                        clonedElement.style.fontSize = '10px';
                    }
                }
            });

            document.body.removeChild(tempElement);

            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Check if content fits on one page
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            if (imgHeight <= pageHeight) {
                // Content fits on one page
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
            } else {
                // Content is too long - scale to fit one page
                const scale = pageHeight / imgHeight;
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth * scale, pageHeight);
            }
            
            pdf.save(`invoice_${orderData.OrderID}.pdf`);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            document.body.removeChild(tempElement);
            
            // Fallback: Use original method
            const canvas = await html2canvas(input, { 
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
            pdf.save(`invoice_${orderData.OrderID}.pdf`);
        }
    };


    

    // const handlePrint = () => {
    //     const printContent = document.getElementById('invoice-print-content').innerHTML;
    //     const printWindow = window.open('', '_blank', 'width=1000,height=800');
        
    //     printWindow.document.write(`
    //         <!DOCTYPE html>
    //         <html>
    //         <head>
    //             <title>Invoice ${orderData.OrderID} - ${COMPANY_INFO.brand}</title>
    //             <meta charset="utf-8">
    //             <style>
    //                 @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                    
    //                 * {
    //                     margin: 0;
    //                     padding: 0;
    //                     box-sizing: border-box;
    //                 }
                    
    //                 body {
    //                     font-family: 'Inter', sans-serif;
    //                     background: white;
    //                     padding: 0;
    //                     margin: 0;
    //                     font-size: 10px;
    //                     line-height: 1.2;
    //                     width: 210mm;
    //                     min-height: 297mm;
    //                 }
                    
    //                 .invoice-print-container {
    //                     width: 210mm;
    //                     min-height: 297mm;
    //                     margin: 0 auto;
    //                     background: white;
    //                     padding: 15mm;
    //                     position: relative;
    //                 }
                    
    //                 /* Ultra Compact Header Styles */
    //                 .print-header {
    //                     display: flex;
    //                     justify-content: space-between;
    //                     align-items: flex-start;
    //                     border-bottom: 1px solid #e74c3c;
    //                     padding-bottom: 8px;
    //                     margin-bottom: 8px;
    //                 }
                    
    //                 .print-company-info h2 {
    //                     color: #e74c3c;
    //                     margin: 0 0 3px 0;
    //                     font-size: 12px;
    //                     font-weight: 700;
    //                 }
                    
    //                 .print-company-info .brand {
    //                     color: #2c3e50;
    //                     font-size: 10px;
    //                     font-weight: 600;
    //                     margin-bottom: 4px;
    //                 }
                    
    //                 .print-company-info p {
    //                     margin: 1px 0;
    //                     font-size: 8px;
    //                     color: #555;
    //                     line-height: 1.1;
    //                 }
                    
    //                 .print-logo-section {
    //                     display: flex;
    //                     align-items: center;
    //                     gap: 8px;
    //                     margin-bottom: 5px;
    //                 }
                    
    //                 .print-logo {
    //                     width: 80px;
    //                     height: 25px;
    //                     background: #e74c3c;
    //                     border-radius: 4px;
    //                     display: flex;
    //                     align-items: center;
    //                     justify-content: center;
    //                     color: white;
    //                     font-weight: bold;
    //                     font-size: 8px;
    //                 }
                    
    //                 .print-qr {
    //                     width: 35px;
    //                     height: 35px;
    //                     background: #f8f9fa;
    //                     border: 1px solid #e74c3c;
    //                     border-radius: 4px;
    //                 }
                    
    //                 .print-invoice-meta {
    //                     text-align: right;
    //                 }
                    
    //                 .print-invoice-meta h1 {
    //                     color: #e74c3c;
    //                     margin: 0 0 5px 0;
    //                     font-size: 14px;
    //                     font-weight: 800;
    //                     text-transform: uppercase;
    //                 }
                    
    //                 .print-invoice-details {
    //                     background: #e74c3c;
    //                     color: white;
    //                     padding: 6px;
    //                     border-radius: 4px;
    //                 }
                    
    //                 .print-invoice-details p {
    //                     margin: 2px 0;
    //                     font-size: 8px;
    //                     font-weight: 500;
    //                 }
                    
    //                 /* Ultra Compact Customer Details */
    //                 .print-customer-details {
    //                     display: grid;
    //                     grid-template-columns: 1fr 1fr;
    //                     gap: 8px;
    //                     margin-bottom: 8px;
    //                 }
                    
    //                 .print-detail-box {
    //                     background: #f8f9fa;
    //                     padding: 6px;
    //                     border-radius: 4px;
    //                     border-left: 2px solid #e74c3c;
    //                 }
                    
    //                 .print-detail-box h3 {
    //                     margin: 0 0 4px 0;
    //                     color: #2c3e50;
    //                     font-size: 9px;
    //                     font-weight: 700;
    //                 }
                    
    //                 .print-detail-box p {
    //                     margin: 2px 0;
    //                     font-size: 8px;
    //                     color: #555;
    //                     line-height: 1.1;
    //                 }
                    
    //                 /* Ultra Compact Products Table */
    //                 .print-products-section {
    //                     margin-bottom: 8px;
    //                 }
                    
    //                 .print-products-section h3 {
    //                     color: white;
    //                     margin-bottom: 5px;
    //                     font-size: 10px;
    //                     font-weight: 700;
    //                     text-align: center;
    //                     background: #e74c3c;
    //                     padding: 4px;
    //                     border-radius: 3px;
    //                 }
                    
    //                 .print-products-table {
    //                     width: 100%;
    //                     border-collapse: collapse;
    //                     font-size: 7px;
    //                     border-radius: 3px;
    //                     overflow: hidden;
    //                 }
                    
    //                 .print-products-table th {
    //                     background: #2c3e50;
    //                     color: white;
    //                     padding: 3px 2px;
    //                     text-align: left;
    //                     font-weight: 600;
    //                     font-size: 6px;
    //                     text-transform: uppercase;
    //                 }
                    
    //                 .print-products-table td {
    //                     padding: 2px;
    //                     border-bottom: 1px solid #ecf0f1;
    //                     background: white;
    //                 }
                    
    //                 .print-products-table tr:nth-child(even) td {
    //                     background: #f8f9fa;
    //                 }
                    
    //                 /* Ultra Compact Totals Section */
    //                 .print-totals-section {
    //                     display: grid;
    //                     grid-template-columns: 1fr 1fr;
    //                     gap: 8px;
    //                     margin-bottom: 8px;
    //                 }
                    
    //                 .print-amount-breakdown {
    //                     background: #f8f9fa;
    //                     padding: 6px;
    //                     border-radius: 4px;
    //                 }
                    
    //                 .print-total-row {
    //                     display: flex;
    //                     justify-content: space-between;
    //                     align-items: center;
    //                     padding: 2px 0;
    //                     border-bottom: 1px solid #ddd;
    //                     font-size: 8px;
    //                     font-weight: 500;
    //                 }
                    
    //                 .print-grand-total {
    //                     display: flex;
    //                     justify-content: space-between;
    //                     align-items: center;
    //                     padding: 4px 0 0 0;
    //                     margin-top: 4px;
    //                     border-top: 1px solid #e74c3c;
    //                     font-size: 9px;
    //                     font-weight: 700;
    //                     color: #e74c3c;
    //                 }
                    
    //                 .print-bank-signature {
    //                     display: flex;
    //                     flex-direction: column;
    //                     gap: 6px;
    //                 }
                    
    //                 .print-bank-details {
    //                     background: #667eea;
    //                     color: white;
    //                     padding: 6px;
    //                     border-radius: 4px;
    //                 }
                    
    //                 .print-bank-details h4 {
    //                     margin: 0 0 4px 0;
    //                     color: white;
    //                     font-size: 9px;
    //                     font-weight: 700;
    //                 }
                    
    //                 .print-bank-details p {
    //                     margin: 1px 0;
    //                     font-size: 7px;
    //                     opacity: 0.9;
    //                 }
                    
    //                 .print-signature {
    //                     background: #f8f9fa;
    //                     padding: 6px;
    //                     border-radius: 4px;
    //                     text-align: center;
    //                 }
                    
    //                 .print-signature-line {
    //                     width: 100px;
    //                     height: 1px;
    //                     background: #34495e;
    //                     margin: 15px auto 3px auto;
    //                 }
                    
    //                 /* Ultra Compact Footer */
    //                 .print-footer {
    //                     margin-top: 8px;
    //                     padding-top: 6px;
    //                     border-top: 1px solid #e74c3c;
    //                 }
                    
    //                 .print-terms-container {
    //                     display: grid;
    //                     grid-template-columns: 2fr 1fr;
    //                     gap: 8px;
    //                     margin-bottom: 6px;
    //                 }
                    
    //                 .print-terms {
    //                     font-size: 6px;
    //                     color: #666;
    //                 }
                    
    //                 .print-terms h4 {
    //                     margin: 0 0 4px 0;
    //                     color: #2c3e50;
    //                     font-size: 8px;
    //                     font-weight: 700;
    //                 }
                    
    //                 .print-terms ul {
    //                     margin: 0;
    //                     padding-left: 8px;
    //                 }
                    
    //                 .print-terms li {
    //                     margin-bottom: 1px;
    //                     line-height: 1.1;
    //                 }
                    
    //                 .print-qr-section {
    //                     display: flex;
    //                     flex-direction: column;
    //                     align-items: center;
    //                     justify-content: center;
    //                     background: #f8f9fa;
    //                     padding: 4px;
    //                     border-radius: 4px;
    //                     text-align: center;
    //                 }
                    
    //                 .print-qr-large {
    //                     width: 50px;
    //                     height: 50px;
    //                     background: white;
    //                     border: 1px solid #e74c3c;
    //                     border-radius: 3px;
    //                     margin-bottom: 2px;
    //                 }
                    
    //                 .print-footer-note {
    //                     text-align: center;
    //                     padding: 4px;
    //                     background: #2c3e50;
    //                     color: white;
    //                     border-radius: 3px;
    //                     margin-top: 4px;
    //                 }
                    
    //                 .print-footer-note p {
    //                     margin: 1px 0;
    //                     font-size: 7px;
    //                     font-weight: 500;
    //                 }
                    
    //                 /* Print-specific optimizations */
    //                 @media print {
    //                     body {
    //                         margin: 0 !important;
    //                         padding: 0 !important;
    //                         background: white !important;
    //                         font-size: 8px !important;
    //                         width: 210mm !important;
    //                         height: 297mm !important;
    //                     }
                        
    //                     .invoice-print-container {
    //                         padding: 15mm !important;
    //                         margin: 0 !important;
    //                         width: 210mm !important;
    //                         min-height: 297mm !important;
    //                         box-shadow: none !important;
    //                         border: none !important;
    //                     }
                        
    //                     /* Ensure everything fits on one page */
    //                     .print-header,
    //                     .print-customer-details,
    //                     .print-products-section,
    //                     .print-totals-section,
    //                     .print-footer {
    //                         page-break-inside: avoid;
    //                     }
    //                 }
                    
    //                 /* Hide unnecessary elements for print */
    //                 .no-print {
    //                     display: none !important;
    //                 }
    //             </style>
    //         </head>
    //         <body>
    //             <div class="invoice-print-container">
    //                 <div class="invoice-content">
    //                     ${printContent}
    //                 </div>
    //             </div>
    //             <script>
    //                 window.onload = function() { 
    //                     setTimeout(() => {
    //                         window.print();
    //                         setTimeout(() => {
    //                             window.close();
    //                         }, 500);
    //                     }, 100);
    //                 }
    //             </script>
    //         </body>
    //         </html>
    //     `);
    //     printWindow.document.close();
    // };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>
                        <FaFileInvoice className={styles.titleIcon} />
                        <h2>Invoice Preview - {orderData.OrderID}</h2>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className={styles.invoiceWrapper}>
                    {/* Invoice content for PDF/Print */}
                    <div ref={invoiceRef} className={styles.invoiceBody}>
                        <div id="invoice-print-content" className={styles.invoiceContainer}>
                            
                            {/* Header Section */}
                            <div className={styles.header}>
                                <div className={styles.companyInfo}>
                                    <div className={styles.logoSection}>
                                        <div className={styles.logoContainer}>
                                            <div className={styles.logo}>
                                                <img src="./img/logo.png" alt="The Hen's Co." className={styles.logoImage} />
                                            </div>
                                            {/* <div className={styles.qrCode}>
                                                <img src="./img/qr.png" alt="QR Code" className={styles.qrImage} />
                                            </div> */}
                                        </div>
                                    </div>
                                    <h2>{COMPANY_INFO.name}</h2>
                                    {/* <p className={styles.brand}>({COMPANY_INFO.brand})</p> */}
                                    <div className={styles.companyDetails}>
                                        <p><strong>GSTIN:</strong> {COMPANY_INFO.gstin}</p>
                                        <p><strong>PAN:</strong> {COMPANY_INFO.pan}</p>
                                        <p><strong>Address:</strong> {COMPANY_INFO.address}</p>
                                    </div>
                                </div>
                                <div className={styles.invoiceMeta}>
                                    <h1>Bill of Supply/INVOICE </h1>
                                    <div className={styles.invoiceDetails}>
                                        <p><strong>Invoice No:</strong> {orderData.InvoiceNo}</p>
                                        <p><strong>Invoice Date:</strong> {formatDate(orderData.OrderDate)}</p>
                                        <p><strong>Delivery Date:</strong> {formatDate(orderData.DeliveryDate)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Details */}
                            <div className={styles.customerDetails}>
                                <div className={styles.detailBox}>
                                    <h3>Bill To</h3>
                                    <p><strong>{orderData.CustomerName}</strong></p>
                                    <p>{orderData.Address}, {orderData.Area}</p>
                                    <p><strong>Contact:</strong> {orderData.ContactNo}</p>
                                    <p><strong>GSTIN:</strong> {orderData.GSTIN || 'Not Provided'}</p>
                                </div>
                                <div className={styles.detailBox}>
                                    <h3>Ship To</h3>
                                    <p>Same as billing address</p>
                                    <p><strong>Payment Terms:</strong> On Delivery</p>
                               <p><strong>Order Taken By:</strong> {orderData.OrderTakenBy || 'N/A'}</p>

                                </div>
                            </div>

                            {/* Products Table */}
                            <div className={styles.productsSection}>
                                <h3>PRODUCT DETAILS</h3>
                                <table className={styles.productsTable}>
                                    <thead>
                                        <tr>
                                            <th>SNo.</th>
                                            <th>HSN</th>
                                            <th>Product Description</th>
                                            <th>GST %</th>
                                            <th>Rate</th>
                                            <th>Qty</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productItems.map((item, index) => (
                                            <tr key={index}>
                                                <td className={styles.serialNo}>{index + 1}</td>
                                                <td className={styles.hsnCode}>{item.hsn}</td>
                                                <td className={styles.productDesc}>{item.productName}</td>
                                                <td className={styles.gstRate}>{item.gstRate}%</td>
                                                <td className={styles.rate}>₹{item.rate}</td>
                                                <td className={styles.quantity}>{item.qty}</td>
                                                <td className={styles.amount}>₹{item.totalAmt}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Totals Section */}
                            <div className={styles.totalsSection}>
                                <div className={styles.amountBreakdown}>
                                    <h4>AMOUNT BREAKDOWN</h4>
                                    <div className={styles.totalRow}>
                                        <span>Sub Total:</span>
                                        <span>₹{subTotal}</span>
                                    </div>
                                    <div className={styles.totalRow}>
                                        <span>Packing:</span>
                                        <span>₹{deliveryCharge}</span>
                                    </div>
                                   
                                    <div className={styles.grandTotal}>
                                        <span>Total Amount:</span>
                                        <span>₹{totalAmount}</span>
                                    </div>
                                </div>
                                
                                <div className={styles.bankSignature}>
                                    <div className={styles.bankDetails}>
                                        <h4>BANK DETAILS</h4>
                                        <p><strong>Account Name:</strong> {COMPANY_INFO.bankDetails.accountName}</p>
                                        <p><strong>Bank:</strong> {COMPANY_INFO.bankDetails.bankName}</p>
                                        <p><strong>A/C No:</strong> {COMPANY_INFO.bankDetails.accountNumber}</p>
                                        <p><strong>IFSC:</strong> {COMPANY_INFO.bankDetails.ifscCode}</p>
                                    </div>
                                    <div className={styles.signature}>
                                        <p>For {COMPANY_INFO.name}</p>
                                        <div className={styles.signatureLine}></div>
                                        <p>Authorized Signatory</p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className={styles.footer}>
                                <div className={styles.termsContainer}>
                                    <div className={styles.terms}>
                                        <h4>TERMS & CONDITIONS</h4>
                                        <ul>
                                            {TERMS_CONDITIONS.slice(0, 4).map((term, index) => (
                                                <li key={index}>{term}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className={styles.qrSection}>
                                        <div className={styles.qrLarge}>
                                            <img src="./img/qr.png" alt="QR Code" className={styles.qrLargeImage} />
                                        </div>
                                        <p>Scan for verification</p>
                                    </div>
                                </div>
                                <div className={styles.footerNote}>
                                    <p>Thank you for your business!</p>
                                    <p>E. & O. E. | This is a computer-generated invoice</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={styles.modalActions}>
                        {/* <button className={styles.printBtn} onClick={handlePrint}>
                            <FaPrint /> Print Invoice
                        </button> */}
                        <button className={styles.downloadBtn} onClick={downloadPdf}>
                            <FaDownload /> Download PDF
                        </button>
                        <button className={styles.closeBtn} onClick={onClose}>
                            <FaTimes /> Close Preview
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceGenerator;