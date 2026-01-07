// PrintOrderDetails.jsx
export const printOrderDetails = (orders, deliveryManId, deliveryManName) => {
  // Calculate totals
  const totalCash = orders.reduce(
    (sum, order) => sum + (order.CashAmount || 0),
    0
  );
  const totalOrders = orders.length;
  const totalQuantity = orders.reduce(
    (sum, order) => sum + (order.Quantity || 0),
    0
  );
  const totalDeliveryCharge = orders.reduce(
    (sum, order) => sum + (parseFloat(order.DeliveryCharge) || 0),
    0
  );

  const printWindow = window.open("", "_blank");
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
            padding: 20px 25px;
            color: #1f2937;
            background: #ffffff;
            line-height: 1.5;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Report Header */
          .report-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #4f46e5;
          }
          
          .company-info {
            flex: 1;
          }
          
          .company-name {
            font-size: 22px;
            font-weight: 700;
            color: #4f46e5;
            margin-bottom: 3px;
          }
          
          .company-tagline {
            font-size: 13px;
            color: #6b7280;
            font-weight: 400;
          }
          
          .report-info {
            text-align: right;
          }
          
          .report-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 6px;
          }
          
          .report-date {
            font-size: 12px;
            color: #6b7280;
          }
          
          .delivery-info {
            font-size: 12px;
            color: #374151;
            margin-top: 4px;
            font-weight: 500;
          }
          
          /* Summary Stats */
          .summary-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          
          .stat-box {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px 10px;
            text-align: center;
          }
          
          .stat-label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 4px;
            font-weight: 500;
          }
          
          .stat-value {
            font-size: 18px;
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
            margin-top: 15px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            overflow: hidden;
          }
          
          .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            table-layout: fixed;
          }
          
          .data-table thead {
            background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          }
          
          .data-table th {
            padding: 10px 6px;
            text-align: left;
            font-weight: 600;
            color: white;
            border: none;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.2px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .data-table th:first-child {
            padding-left: 10px;
          }
          
          .data-table th:last-child {
            padding-right: 10px;
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
            padding: 8px 6px;
            vertical-align: top;
            word-wrap: break-word;
          }
          
          .data-table td:first-child {
            padding-left: 10px;
          }
          
          .data-table td:last-child {
            padding-right: 10px;
          }
          
          /* Column specific styles */
          .col-order-id {
            font-weight: 600;
            color: #1f2937;
            font-size: 9.5px;
          }
          
          .col-customer {
            font-weight: 500;
          }
          
          .col-amount {
            font-weight: 600;
            color: #059669;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-size: 9.5px;
          }
          
          .col-rate, .col-delivery {
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-size: 9.5px;
          }
          
          .col-date {
            white-space: nowrap;
            font-size: 9.5px;
          }
          
          .col-address {
            font-size: 9.5px;
            line-height: 1.3;
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
            padding: 12px 15px;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
          }
          
          .total-label {
            font-size: 12px;
            font-weight: 500;
            color: #4b5563;
          }
          
          .total-value {
            font-size: 12px;
            font-weight: 600;
            color: #1f2937;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          }
          
          .total-value.grand-total {
            font-size: 14px;
            color: #059669;
          }
          
          /* Report Footer */
          .report-footer {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            font-size: 10px;
            color: #9ca3af;
            text-align: center;
          }
          
          .contact-info {
            margin-top: 4px;
          }
          
          /* Print Specific Styles - MOST IMPORTANT PART */
          @media print {
            @page {
              margin: 10mm 5mm !important;
              size: A4 landscape;
            }
            
            body {
              padding: 0 !important;
              margin: 0 !important;
              font-size: 8.5pt !important;
              width: 100% !important;
              height: 100% !important;
              overflow: visible !important;
            }
            
            /* Remove all browser headers/footers */
            @page {
              margin-top: 0;
              margin-bottom: 0;
            }
            
            @page :first {
              margin-top: 0;
            }
            
            @page :last {
              margin-bottom: 0;
            }
            
            /* Hide page numbers and URLs */
            body::after {
              display: none !important;
            }
            
            /* Ensure no page breaks inside important elements */
            .data-table-container {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            .summary-stats {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            .table-totals {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            /* Force everything on one page */
            .report-header,
            .summary-stats,
            .data-table-container,
            .table-totals,
            .report-footer {
              page-break-before: avoid !important;
              page-break-after: avoid !important;
              break-before: avoid !important;
              break-after: avoid !important;
            }
            
            /* Table adjustments for print */
            .data-table {
              font-size: 8pt !important;
              width: 100% !important;
            }
            
            .data-table th {
              padding: 6px 4px !important;
              font-size: 8pt !important;
            }
            
            .data-table td {
              padding: 5px 4px !important;
              font-size: 8pt !important;
            }
            
            .summary-stats {
              gap: 8px !important;
              margin-bottom: 15px !important;
            }
            
            .stat-box {
              padding: 8px 6px !important;
            }
            
            .stat-value {
              font-size: 14px !important;
            }
            
            /* Reduce spacing for print */
            .report-header {
              margin-bottom: 12px !important;
              padding-bottom: 10px !important;
            }
            
            .data-table-container {
              margin-top: 10px !important;
            }
            
            .table-totals {
              padding: 8px 10px !important;
            }
            
            .report-footer {
              margin-top: 15px !important;
              padding-top: 10px !important;
            }
            
            /* Ensure colors print properly */
            .data-table thead,
            .stat-box,
            .table-totals {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            /* Hide unnecessary elements in print */
            .screen-only {
              display: none !important;
            }
            
            /* Prevent text from being too small */
            .col-order-id,
            .col-customer,
            .col-address,
            .col-amount,
            .col-rate,
            .col-delivery,
            .col-date {
              font-size: 7.5pt !important;
              line-height: 1.2 !important;
            }
          }
          
          /* Hide from screen but show in print */
          .screen-only {
            display: block;
            margin-bottom: 10px;
            padding: 8px;
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 4px;
            font-size: 11px;
            color: #0369a1;
            text-align: center;
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
            <div class="report-date">${new Date().toLocaleDateString(
              "en-GB"
            )}</div>
            <div class="delivery-info">
              <strong>Delivery Person:</strong> ${
                deliveryManName || deliveryManId
              }
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
                <th style="width: 7%;">Order ID</th>
                <th style="width: 8%;">Invoice No</th>
                <th style="width: 10%;">Customer</th>
                <th style="width: 9%;">Product</th>
                <th style="width: 4%;" class="text-center">Qty</th>
                <th style="width: 6%;" class="text-right">Rate</th>
                <th style="width: 7%;" class="text-right">Delivery</th>
                <th style="width: 15%;">Address</th>
                <th style="width: 7%;">Area</th>
                <th style="width: 8%;">Contact</th>
                <th style="width: 7%;" class="text-right">Amount</th>
                <th style="width: 8%;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${orders
                .map(
                  (order) => `
                <tr>
                  <td class="col-order-id">${order.OrderID || "N/A"}</td>
                  <td>${order.InvoiceNo || "N/A"}</td>
                  <td class="col-customer">${order.CustomerName || "N/A"}</td>
                  <td>${order.ProductType || "N/A"}</td>
                  <td class="text-center">${order.Quantity || "0"}</td>
                  <td class="col-rate text-right">₹${parseFloat(
                    order.Rate || 0
                  ).toFixed(2)}</td>
                  <td class="col-delivery text-right">₹${parseFloat(
                    order.DeliveryCharge || 0
                  ).toFixed(2)}</td>
                  <td class="col-address">${order.Address || "N/A"}</td>
                  <td>${order.Area || "N/A"}</td>
                  <td>${order.ContactNo || "N/A"}</td>
                  <td class="col-amount text-right">₹${parseFloat(
                    order.CashAmount || 0
                  ).toFixed(2)}</td>
                  <td class="col-date">${
                    order.PaymentDate ? order.PaymentDate.split("T")[0] : "N/A"
                  }</td>
                </tr>
              `
                )
                .join("")}
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
            <span class="total-value grand-total">₹${totalCash.toFixed(
              2
            )}</span>
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
              // Close window after print (optional)
              setTimeout(function() {
                window.close();
              }, 500);
            }, 500);
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
    "Order ID",
    "Invoice No",
    "Customer",
    "Product",
    "Quantity",
    "Rate",
    "Delivery Charge",
    "Address",
    "Area",
    "Contact No",
    "Amount",
    "Date",
  ];

  const csvContent = [
    ["Delivery Person:", deliveryManName || deliveryManId],
    ["Report Date:", new Date().toLocaleDateString("en-GB")],
    ["Total Orders:", orders.length],
    [
      "Total Amount:",
      "₹" +
        orders
          .reduce((sum, order) => sum + (order.CashAmount || 0), 0)
          .toFixed(2),
    ],
    [], // Empty row
    headers,
    ...orders.map((order) =>
      [
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
        order.PaymentDate?.split("T")[0],
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Cash_Orders_${deliveryManId}_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
