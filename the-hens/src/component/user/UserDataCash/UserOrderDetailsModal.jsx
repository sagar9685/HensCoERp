import React, { useEffect, useRef } from "react";
import styles from "./OrderDetailsModal.module.css";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPendingCashOrders,
  clearPendingOrders
} from "../../../features/paymentModeSlice";
import { FiX, FiPrinter, FiDownload, FiUser, FiCalendar, FiDollarSign } from "react-icons/fi";
import { HiDocumentText } from "react-icons/hi";

export default function OrderDetailsModal({ deliveryManId, onClose }) {
  const dispatch = useDispatch();
  const modalRef = useRef();
  const { list: orders, loading } = useSelector(
    (state) => state.pendingCashOrders
  );
  console.log(orders,"order click on details")

  useEffect(() => {
    if (deliveryManId) {
      dispatch(fetchPendingCashOrders(deliveryManId));
    }

    return () => {
      dispatch(clearPendingOrders());
    };
  }, [deliveryManId, dispatch]);

  // Calculate totals
  const totalCash = orders.reduce((sum, order) => sum + (order.CashAmount || 0), 0);
  const totalOrders = orders.length;
  const totalQuantity = orders.reduce((sum, order) => sum + (order.Quantity || 0), 0);
const deliveryManName = orders[0]?.DeliveryManName || deliveryManId;



  // Print function
  const handlePrint = () => {
    const printContent = modalRef.current;
    const originalContent = document.body.innerHTML;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Pending Cash Orders Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .print-header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 2px solid #4f46e5;
              padding-bottom: 20px;
            }
            .print-header h1 { color: #4f46e5; margin: 0; }
            .print-summary {
              display: flex;
              justify-content: space-between;
              margin: 20px 0;
              padding: 15px;
              background: #f8fafc;
              border-radius: 8px;
            }
            .summary-item { text-align: center; }
            .summary-value { 
              font-size: 24px; 
              font-weight: bold;
              color: #4f46e5;
            }
            table { 
              width: 100%; 
              border-collapse: collapse;
              margin-top: 20px;
            }
            th { 
              background: #4f46e5; 
              color: white;
              padding: 12px;
              text-align: left;
            }
            td { 
              padding: 10px;
              border-bottom: 1px solid #e5e7eb;
            }
            tr:nth-child(even) { background: #f8fafc; }
            .print-footer {
              margin-top: 30px;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            }
            @media print {
              @page { margin: 0.5in; }
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>Pending Cash Orders Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
            <p>Delivery Man Name: ${deliveryManName}</p>
          </div>
          
          <div class="print-summary">
            <div class="summary-item">
              <div class="summary-label">Total Orders</div>
              <div class="summary-value">${totalOrders}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Quantity</div>
              <div class="summary-value">${totalQuantity}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Cash</div>
              <div class="summary-value">₹${totalCash.toFixed(2)}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Invoice No</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Address</th>
<th>Area</th>
<th>Contact No</th>
<th>Rate</th>
<th>Delivery Charge</th>

                
              </tr>
            </thead>
            <tbody>
              ${orders.map(order => `
                <tr>
                  <td>${order.OrderID || 'N/A'}</td>
                  <td>${order.InvoiceNo || 'N/A'}</td>
                  <td>${order.CustomerName || 'N/A'}</td>
                  <td>${order.ProductType || 'N/A'}</td>
                  <td>${order.Quantity || '0'}</td>
                  <td>₹${(order.CashAmount || 0).toFixed(2)}</td>
                  <td>${order.PaymentDate ? order.PaymentDate.split('T')[0] : 'N/A'}</td>
                  <td>${order.Address || 'N/A'}</td>
<td>${order.Area || 'N/A'}</td>
<td>${order.ContactNo || 'N/A'}</td>
<td>₹${order.Rate || 0}</td>
<td>₹${order.DeliveryCharge || 0}</td>

                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="print-footer">
            <p>Report generated by Cash Management System</p>
             <p>For any query contact sagargupta12396@gmail.com</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Download as CSV
  const handleDownloadCSV = () => {
  const headers = [
  'Order ID',
  'Invoice No',
  'Customer',
  'Product',
  'Quantity',
  'Rate',
  'Delivery Charge',
  'Address',
  'Area',
  'Contact',
  'Amount',
  'Date'
];

    const csvContent = [
      headers.join(','),
     ...orders.map(order => [
  order.OrderID,
  order.InvoiceNo,
  order.CustomerName,
  order.ProductType,
  order.Quantity,
  order.Rate,
  order.DeliveryCharge,
  order.Address,
  order.Area,
  order.ContactNo,
  order.CashAmount,
  order.PaymentDate?.split('T')[0]
].join(','))

    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pending-cash-orders-${deliveryManId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} ref={modalRef}>
        <div className={styles.modalContainer}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <HiDocumentText className={styles.headerIcon} />
              <div>
                <h3>Pending Cash Orders</h3>
                {deliveryManId && (
                  <p className={styles.deliveryManId}>Delivery Man ID: <span>{deliveryManId}</span></p>
                )}
              </div>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.actionBtn}
                onClick={handleDownloadCSV}
                title="Download CSV"
              >
                <FiDownload />
              </button>
              <button 
                className={styles.actionBtn}
                onClick={handlePrint}
                title="Print Report"
              >
                <FiPrinter />
              </button>
              <button 
                className={styles.closeBtn}
                onClick={onClose}
                title="Close"
              >
                <FiX />
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {!loading && orders.length > 0 && (
            <div className={styles.summaryCards}>
              <div className={styles.summaryCard}>
                <div className={styles.cardIcon}>
                  <HiDocumentText />
                </div>
                <div className={styles.cardContent}>
                  <span className={styles.cardLabel}>Total Orders</span>
                  <span className={styles.cardValue}>{totalOrders}</span>
                </div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.cardIcon}>
                  <FiUser />
                </div>
                <div className={styles.cardContent}>
                  <span className={styles.cardLabel}>Total Quantity</span>
                  <span className={styles.cardValue}>{totalQuantity}</span>
                </div>
              </div>
              <div className={`${styles.summaryCard} ${styles.totalCard}`}>
                <div className={styles.cardIcon}>
                  <FiDollarSign />
                </div>
                <div className={styles.cardContent}>
                  <span className={styles.cardLabel}>Total Cash</span>
                  <span className={styles.cardValue}>₹{totalCash.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className={styles.content}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Loading pending orders...</p>
              </div>
            ) : (
              <div className={styles.tableSection}>
                {orders.length === 0 ? (
                  <div className={styles.emptyState}>
                    <HiDocumentText className={styles.emptyIcon} />
                    <h4>No Pending Cash Orders</h4>
                    <p>There are no pending cash orders for this delivery person.</p>
                  </div>
                ) : (
                  <>
                    <div className={styles.tableWrapper}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Invoice No</th>
                            <th>Customer</th>
                            <th>Product</th>
                            <th className={styles.textCenter}>Qty</th>
                            <th className={styles.textRight}>Amount</th>
                            <th>Date</th><th>Address</th>
<th>Area</th>
<th>Contact</th>
<th className={styles.textRight}>Rate</th>
<th className={styles.textRight}>Delivery</th>

                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order) => (
                            <tr key={order.PaymentID} className={styles.tableRow}>
                              <td className={styles.orderId}>{order.OrderID}</td>
                              <td className={styles.invoiceNo}>{order.InvoiceNo}</td>
                              <td className={styles.customerName}>{order.CustomerName}</td>
                              <td className={styles.productType}>{order.ProductType}</td>
                              <td className={styles.textCenter}>{order.Quantity}</td>
                              <td className={`${styles.amount} ${styles.textRight}`}>
                                ₹{order.CashAmount?.toFixed(2)}
                              </td>
                              <td className={styles.date}>
                                <FiCalendar className={styles.dateIcon} />
                                {order.PaymentDate?.split("T")[0]}
                              </td>
                              <td>{order.Address}</td>
<td>{order.Area}</td>
<td>{order.ContactNo}</td>
<td className={styles.textRight}>₹{order.Rate}</td>
<td className={styles.textRight}>₹{order.DeliveryCharge}</td>

                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className={styles.tableFooter}>
                      <div className={styles.footerInfo}>
                        Showing <strong>{orders.length}</strong> pending cash orders
                      </div>
                      <div className={styles.footerTotal}>
                        Total: <span>₹{totalCash.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}