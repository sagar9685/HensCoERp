// PrintOrderDetails.jsx
export const printOrderDetails = (orders, deliveryManId, deliveryManName) => {
  // Calculate totals
  const totalCash = orders.reduce((sum, order) => sum + (order.CashAmount || 0), 0);
  const totalOrders = orders.length;
  const totalQuantity = orders.reduce((sum, order) => sum + (order.Quantity || 0), 0);
  const totalDeliveryCharge = orders.reduce((sum, order) => sum + (parseFloat(order.DeliveryCharge) || 0), 0);

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Pending Cash Orders Report</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body { 
            font-family: 'Inter', sans-serif; 
            padding: 25px 30px;
            color: #1f2937;
            background: #ffffff;
            line-height: 1.5;
          }
          
          /* Report Header */
          .report-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #4f46e5;
          }
          
          .company-info {
            flex: 1;
          }
          
          .company-name {
            font-size: 24px;
            font-weight: 700;
            color: #4f46e5;
            margin-bottom: 5px;
          }
          
          .company-tagline {
            font-size: 14px;
            color: #6b7280;
            font-weight: 400;
          }
          
          .report-info {
            text-align: right;
          }
          
          .report-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 8px;
          }
          
          .report-date {
            font-size: 13px;
            color: #6b7280;
          }
          
          .delivery-info {
            font-size: 13px;
            color: #374151;
            margin-top: 5px;
            font-weight: 500;
          }
          
          /* Summary Stats */
          .summary-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          
          .stat-box {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 15px;
            text-align: center;
          }
          
          .stat-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
            font-weight: 500;
          }
          
          .stat-value {
            font-size: 22px;
            font-weight: 700;
            color: #1f2937;
          }
          
          .stat-value.total {
            color: #059669;
          }
          
          .stat-value.orders {
            color: #4f46e5;
          }
          
          /* Table Styles */
          .data-table-container {
            margin-top: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.5px;
          }
          
          .data-table thead {
            background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          }
          
          .data-table th {
            padding: 14px 10px;
            text-align: left;
            font-weight: 600;
            color: white;
            border: none;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          
          .data-table th:first-child {
            padding-left: 15px;
          }
          
          .data-table th:last-child {
            padding-right: 15px;
          }
          
          .data-table tbody tr {
            border-bottom: 1px solid #f3f4f6;
          }
          
          .data-table tbody tr:nth-child(even) {
            background-color: #fafafa;
          }
          
          .data-table tbody tr:hover {
            background-color: #f0f9ff;
          }
          
          .data-table td {
            padding: 12px 10px;
            vertical-align: top;
          }
          
          .data-table td:first-child {
            padding-left: 15px;
          }
          
          .data-table td:last-child {
            padding-right: 15px;
          }
          
          /* Column specific styles */
          .col-order-id {
            font-weight: 600;
            color: #1f2937;
          }
          
          .col-customer {
            font-weight: 500;
            min-width: 120px;
          }
          
          .col-amount {
            font-weight: 600;
            color: #059669;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          }
          
          .col-rate, .col-delivery {
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          }
          
          .col-date {
            white-space: nowrap;
          }
          
          .col-address {
            max-width: 150px;
          }
          
          .text-right {
            text-align: right;
          }
          
          .text-center {
            text-align: center;
          }
          
          /* Table Footer */
          .table-totals {
            background: #f8fafc;
            border-top: 2px solid #e5e7eb;
            padding: 15px;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
          }
          
          .total-label {
            font-size: 13px;
            font-weight: 500;
            color: #4b5563;
          }
          
          .total-value {
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          }
          
          .total-value.grand-total {
            font-size: 16px;
            color: #059669;
          }
          
          /* Report Footer */
          .report-footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #9ca3af;
            text-align: center;
          }
          
          .contact-info {
            margin-top: 5px;
          }
          
          /* Print Specific Styles */
          @media print {
            @page {
              margin: 15mm;
              size: A4 landscape;
            }
            
            body {
              padding: 0;
              font-size: 9pt;
            }
            
            .data-table {
              font-size: 9pt;
            }
            
            .data-table th {
              padding: 10px 8px;
              font-size: 9pt;
            }
            
            .data-table td {
              padding: 9px 8px;
            }
            
            .summary-stats {
              gap: 10px;
            }
            
            .stat-box {
              padding: 12px 8px;
            }
            
            .stat-value {
              font-size: 18px;
            }
            
            /* Ensure colors print properly */
            .data-table thead {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            /* Hide URL and page info */
            .report-footer {
              color: #6b7280;
            }
          }
          
          /* Hide from screen but show in print */
          .screen-only {
            display: none;
          }
          
          @media screen {
            .screen-only {
              display: block;
            }
          }
        </style>
      </head>
      <body>
        <!-- Report Header -->
        <div class="report-header">
          <div class="company-info">
            <div class="company-name">Cash Management System</div>
            <div class="company-tagline">Professional Order Management Solution</div>
          </div>
          <div class="report-info">
            <div class="report-title">Pending Cash Orders Report</div>
            <div class="report-date">${new Date().toLocaleDateString('en-GB')}</div>
            <div class="delivery-info">
              <strong>Delivery Person:</strong> ${deliveryManName || deliveryManId}
            </div>
          </div>
        </div>
        
        <!-- Summary Statistics -->
        <div class="summary-stats">
          <div class="stat-box">
            <div class="stat-label">Total Orders</div>
            <div class="stat-value orders">${totalOrders}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Total Quantity</div>
            <div class="stat-value">${totalQuantity}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Total Delivery Charge</div>
            <div class="stat-value">₹${totalDeliveryCharge.toFixed(2)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Total Cash Amount</div>
            <div class="stat-value total">₹${totalCash.toFixed(2)}</div>
          </div>
        </div>
        
        <!-- Data Table -->
        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 8%;">Order ID</th>
                <th style="width: 10%;">Invoice No</th>
                <th style="width: 12%;">Customer</th>
                <th style="width: 10%;">Product</th>
                <th style="width: 5%;" class="text-center">Qty</th>
                <th style="width: 7%;" class="text-right">Rate</th>
                <th style="width: 8%;" class="text-right">Delivery</th>
                <th style="width: 15%;">Address</th>
                <th style="width: 8%;">Area</th>
                <th style="width: 9%;">Contact</th>
                <th style="width: 8%;" class="text-right">Amount</th>
                <th style="width: 10%;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map((order) => `
                <tr>
                  <td class="col-order-id">${order.OrderID || 'N/A'}</td>
                  <td>${order.InvoiceNo || 'N/A'}</td>
                  <td class="col-customer">${order.CustomerName || 'N/A'}</td>
                  <td>${order.ProductType || 'N/A'}</td>
                  <td class="text-center">${order.Quantity || '0'}</td>
                  <td class="col-rate text-right">₹${parseFloat(order.Rate || 0).toFixed(2)}</td>
                  <td class="col-delivery text-right">₹${parseFloat(order.DeliveryCharge || 0).toFixed(2)}</td>
                  <td class="col-address">${order.Address || 'N/A'}</td>
                  <td>${order.Area || 'N/A'}</td>
                  <td>${order.ContactNo || 'N/A'}</td>
                  <td class="col-amount text-right">₹${parseFloat(order.CashAmount || 0).toFixed(2)}</td>
                  <td class="col-date">${order.PaymentDate ? order.PaymentDate.split('T')[0] : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Table Totals -->
        <div class="table-totals">
          <div class="total-row">
            <span class="total-label">Total Orders:</span>
            <span class="total-value">${totalOrders}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Total Quantity:</span>
            <span class="total-value">${totalQuantity}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Total Delivery Charges:</span>
            <span class="total-value">₹${totalDeliveryCharge.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Grand Total Amount:</span>
            <span class="total-value grand-total">₹${totalCash.toFixed(2)}</span>
          </div>
        </div>
        
        <!-- Report Footer -->
        <div class="report-footer">
          <div class="screen-only">
            <p>This is a preview. Press Ctrl+P to print or use the print button.</p>
          </div>
          <div class="contact-info">
            For inquiries: sagargupta12396@gmail.com | System Generated Report
          </div>
        </div>
        
        <script>
          // Auto print after content loads
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 1000);
          };
        </script>
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
};

export const downloadOrderCSV = (orders, deliveryManId, deliveryManName) => {
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
    'Contact No',
    'Amount',
    'Date'
  ];

  const csvContent = [
    ['Delivery Person:', deliveryManName || deliveryManId],
    ['Report Date:', new Date().toLocaleDateString('en-GB')],
    ['Total Orders:', orders.length],
    ['Total Amount:', '₹' + orders.reduce((sum, order) => sum + (order.CashAmount || 0), 0).toFixed(2)],
    [], // Empty row
    headers,
    ...orders.map(order => [
      order.OrderID,
      order.InvoiceNo,
      `"${order.CustomerName}"`, // Wrap in quotes for CSV
      order.ProductType,
      order.Quantity,
      order.Rate,
      order.DeliveryCharge,
      `"${order.Address}"`, // Wrap in quotes for CSV
      order.Area,
      order.ContactNo,
      order.CashAmount,
      order.PaymentDate?.split('T')[0]
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Cash_Orders_${deliveryManId}_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};