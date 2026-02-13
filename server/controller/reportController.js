const { sql, poolPromise } = require("../utils/db");

/* =======================
   MONTHLY REPORT
======================= */
exports.getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;

    const pool = await poolPromise;

    // 1. Summary: Total Orders + Total Sales (gross)
    const summaryResult = await pool
      .request()
      .input("year", sql.Int, year)
      .input("month", sql.Int, month).query(`
        SELECT 
          COUNT(DISTINCT o.OrderID) AS TotalOrders,
          ISNULL(SUM(oi.Total), 0) AS TotalSales
        FROM OrdersTemp o
        JOIN OrderItems oi ON o.OrderID = oi.OrderID
        WHERE YEAR(o.OrderDate) = @year
          AND MONTH(o.OrderDate) = @month
      `);

    const summary = summaryResult.recordset[0] || {
      TotalOrders: 0,
      TotalSales: 0,
    };

    // 2. Total Received (actual payments jo aa gaye hain)
    const paymentsResult = await pool
      .request()
      .input("year", sql.Int, year)
      .input("month", sql.Int, month).query(`
        SELECT 
          pm.ModeName, 
          ISNULL(SUM(op.Amount), 0) AS Amount
        FROM OrderPayments op
        JOIN PaymentModes pm ON pm.PaymentModeID = op.PaymentModeID
        JOIN OrdersTemp o ON o.OrderID = op.OrderID
        WHERE YEAR(o.OrderDate) = @year
          AND MONTH(o.OrderDate) = @month
        GROUP BY pm.ModeName
      `);

    const paymentBreakup = paymentsResult.recordset || [];

    // 3. Total Received ka grand total nikal lo
    const totalReceived = paymentBreakup.reduce(
      (sum, p) => sum + (p.Amount || 0),
      0,
    );

    // 4. Outstanding calculate karo
    const totalOutstanding = Math.max(0, summary.TotalSales - totalReceived);

    // Final response
    res.status(200).json({
      summary: {
        TotalOrders: summary.TotalOrders,
        TotalSales: summary.TotalSales,
        TotalReceived: totalReceived, // optional - agar dikhana ho
        TotalOutstanding: totalOutstanding, // ← yeh main cheez
      },
      payment: paymentBreakup,
    });
  } catch (err) {
    console.error("Monthly Report Error:", err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};
/* =======================
   WEEKLY REPORT
======================= */
/* =======================
   WEEKLY REPORT
======================= */
exports.getWeeklyReport = async (req, res) => {
  try {
    const { year, month, week } = req.query;

    // Safety: string se number banao
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const weekNum = parseInt(week, 10);

    if (isNaN(yearNum) || isNaN(monthNum) || isNaN(weekNum)) {
      return res.status(400).json({ message: "Invalid year, month or week" });
    }

    const startDay = (weekNum - 1) * 7 + 1;
    const endDay = weekNum * 7;

    const pool = await poolPromise;

    // Query execute karo
    const request = pool
      .request()
      .input("year", sql.Int, yearNum)
      .input("month", sql.Int, monthNum)
      .input("startDay", sql.Int, startDay)
      .input("endDay", sql.Int, endDay);

    const result = await request.query(`
     SELECT 
    CAST(o.OrderDate AS DATE) AS OrderDate,
    COUNT(DISTINCT o.OrderID) AS Orders,
    SUM(oi.Total) AS TotalSales,
    p.ProductType,                  
    p.Rate,
    SUM(oi.Quantity) AS QuantitySold,
    SUM(oi.Total) AS ProductTotalAmount
FROM OrdersTemp o
JOIN OrderItems oi ON o.OrderID = oi.OrderID
JOIN OrderItems p ON oi.OrderID = p.OrderID     
WHERE 
    YEAR(o.OrderDate) = @year
    AND MONTH(o.OrderDate) = @month
    AND DAY(o.OrderDate) BETWEEN @startDay AND @endDay
GROUP BY 
    CAST(o.OrderDate AS DATE),
    p.ProductType,
    p.Rate
ORDER BY 
    OrderDate,
    ProductTotalAmount DESC; 
    `);

    // Response bhejo
    res.status(200).json({
      week: weekNum,
      from: startDay,
      to: endDay,
      data: result.recordset || [],
    });
  } catch (err) {
    console.error("Weekly Report Error:", err); // ← server console mein detail dikhega
    res.status(500).json({
      message: err.message || "Internal server error in weekly report",
    });
  }
};

/* =======================
   DAILY REPORT (By Date & Delivery Boy)
======================= */
exports.getDailyReport = async (req, res) => {
  try {
    const { date, deliveryBoyId } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const pool = await poolPromise;
    const request = pool.request();
    request.input("targetDate", sql.Date, date);

    const dbid =
      deliveryBoyId && deliveryBoyId !== "all" && deliveryBoyId !== ""
        ? parseInt(deliveryBoyId)
        : null;

    if (dbid) {
      request.input("dbid", sql.Int, dbid);
    }

    const boyFilter = dbid ? "AND ao.DeliveryManId = @dbid" : "";

    // =====================================================
    // 1️⃣ PRODUCT BREAKDOWN (All Orders Included)
    // =====================================================
    const itemsResult = await request.query(`
      SELECT 
    t.ProductType,
    t.Weight,
    SUM(t.Qty) AS Qty,
    t.Rate,
    SUM(t.ItemTotal) + SUM(t.DeliveryCharge) AS Amount
FROM (
    SELECT 
        o.OrderID,
        oi.ProductType,
        oi.Weight,
        oi.Quantity AS Qty,
        oi.Rate,
        oi.Total AS ItemTotal,
        CASE 
            WHEN ROW_NUMBER() OVER (PARTITION BY o.OrderID ORDER BY o.OrderID) = 1 
            THEN ISNULL(o.DeliveryCharge,0)
            ELSE 0
        END AS DeliveryCharge
    FROM OrdersTemp o
    JOIN OrderItems oi ON o.OrderID = oi.OrderID
    LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
    WHERE CAST(o.OrderDate AS DATE) = @targetDate
    ${boyFilter}
) t
GROUP BY t.ProductType, t.Weight, t.Rate

    `);

    // =====================================================
    // 2️⃣ PAYMENT BREAKDOWN (All Modes Visible)
    // =====================================================
    const paymentsResult = await request.query(`
      SELECT 
          pm.ModeName,
          SUM(op.Amount) AS ModeTotal,
          pm.IsRevenue
      FROM OrdersTemp o
      JOIN OrderPayments op ON o.OrderID = op.OrderID
      JOIN PaymentModes pm ON pm.PaymentModeID = op.PaymentModeID
      LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
      WHERE CAST(o.OrderDate AS DATE) = @targetDate
      ${boyFilter}
      GROUP BY pm.ModeName, pm.IsRevenue
    `);

    // =====================================================
    // 3️⃣ REVENUE SALES (FOC Excluded)
    // =====================================================
    const revenueSalesResult = await request.query(`
    SELECT SUM(op.Amount) AS RevenueSales
    FROM OrderPayments op
    JOIN OrdersTemp o ON o.OrderID = op.OrderID
    LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
    WHERE CAST(op.PaymentReceivedDate AS DATE) = @targetDate
      AND op.PaymentModeID != 4
      ${boyFilter}
`);

    // =====================================================
    // 4️⃣ REVENUE COLLECTED (FOC Excluded)
    // =====================================================
    const revenueCollectedResult = await request.query(`
     SELECT SUM(op.Amount) AS RevenueCollected
    FROM OrderPayments op
    JOIN OrdersTemp o ON o.OrderID = op.OrderID
    LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
    WHERE CAST(op.PaymentReceivedDate AS DATE) = @targetDate
      AND op.PaymentModeID != 4
      ${boyFilter}
`);

    // =====================================================
    // 5️⃣ TOTAL ORDERS COUNT
    // =====================================================
    const ordersCountResult = await request.query(`
      SELECT COUNT(DISTINCT o.OrderID) AS TotalOrders
      FROM OrdersTemp o
      LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
      WHERE CAST(o.OrderDate AS DATE) = @targetDate
      ${boyFilter}
    `);

    // =====================================================
    // FINAL CALCULATIONS
    // =====================================================
    const productData = itemsResult.recordset || [];
    const paymentData = paymentsResult.recordset || [];

    const totalSaleAmount = revenueSalesResult.recordset[0]?.RevenueSales || 0;

    const totalReceived =
      revenueCollectedResult.recordset[0]?.RevenueCollected || 0;

    const totalOutstanding = totalSaleAmount - totalReceived;

    const totalOrders = ordersCountResult.recordset[0]?.TotalOrders || 0;

    // =====================================================
    // RESPONSE
    // =====================================================
    res.status(200).json({
      date,
      reportType: dbid ? `Delivery Boy ID: ${dbid}` : "Full Day Report (All)",
      summary: {
        totalOrders: totalOrders,
        totalGrossSales: totalSaleAmount, // FOC excluded
        paymentCollected: totalReceived, // FOC excluded
        totalOutstanding: totalOutstanding >= 0 ? totalOutstanding : 0,
      },
      products: productData, // includes FOC items
      payments: paymentData, // shows all modes including FOC
    });
  } catch (err) {
    console.error("Daily Report Error:", err);
    res.status(500).json({
      message: "Internal server error in Daily Report",
    });
  }
};

exports.getCustomerWiseSummaryByDate = async (req, res) => {
  try {
    const { from, to, customer } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "From and To date are required" });
    }

    const pool = await poolPromise;
    const request = pool.request();
    request.input("fromDate", from);
    request.input("toDate", to);

    let customerFilter = "";
    if (customer && customer !== "") {
      request.input("customerName", customer);
      customerFilter = "AND O.CustomerName = @customerName";
    }

    const query = `
      SELECT 
        O.OrderID,
        O.OrderDate,
        O.CustomerName,
        O.ContactNo,
        O.Area,
        O.Address,
        ISNULL(DB.Name, A.OtherDeliveryManName) AS DeliveryBoyName,
        
        -- Product Details
        STRING_AGG(CAST(CONCAT(OI.ProductName, ' [', OI.Weight, ' x ', OI.Quantity, ' @ ', OI.Rate, ']') AS VARCHAR(MAX)), ' | ') AS ItemDetails,
        
        -- Payment Mode Details
        ISNULL((
            SELECT STRING_AGG(CONCAT(PM.ModeName, ': ', OP_Sub.Amount), ', ')
            FROM OrderPayments OP_Sub
            JOIN PaymentModes PM ON OP_Sub.PaymentModeID = PM.PaymentModeID
            WHERE OP_Sub.OrderID = O.OrderID
        ), 'No Payment') AS PaymentModeDetails,

        -- Financials (Fixed grouping error by using MAX for DeliveryCharge)
        (
          ISNULL((SELECT SUM(Total) FROM OrderItems WHERE OrderID = O.OrderID), 0)
          + ISNULL(MAX(O.DeliveryCharge), 0)
        ) AS OrderAmount,

        ISNULL((SELECT SUM(Amount) FROM OrderPayments WHERE OrderID = O.OrderID), 0) AS PaidAmount,

        ISNULL((SELECT SUM(ShortAmount) FROM OrderPayments WHERE OrderID = O.OrderID), 0) AS ShortAmount,

        (
          (ISNULL((SELECT SUM(Total) FROM OrderItems WHERE OrderID = O.OrderID), 0)
           + ISNULL(MAX(O.DeliveryCharge), 0)) -- Wrapped in MAX to fix SQL error
          - ISNULL((SELECT SUM(Amount) FROM OrderPayments WHERE OrderID = O.OrderID), 0)
        ) AS OutstandingAmount

      FROM OrdersTemp O WITH (NOLOCK)
      LEFT JOIN OrderItems OI WITH (NOLOCK) ON O.OrderID = OI.OrderID
      LEFT JOIN AssignedOrders A WITH (NOLOCK) ON O.OrderID = A.OrderID
      LEFT JOIN DeliveryMen DB WITH (NOLOCK) ON A.DeliveryManID = DB.DeliveryManID

      WHERE O.OrderDate BETWEEN @fromDate AND @toDate
      ${customerFilter}

      GROUP BY 
        O.OrderID, 
        O.OrderDate, 
        O.CustomerName, 
        O.ContactNo, 
        O.Area, 
        O.Address,
        DB.Name,
        A.OtherDeliveryManName
      ORDER BY O.OrderDate DESC
    `;

    const result = await request.query(query);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("SQL Error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

exports.getCustomerLedger = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { from, to } = req.query;

    // Optional date filter to see ledger for a specific period
    let dateFilter = "";
    if (from && to) {
      dateFilter = "WHERE O.OrderDate BETWEEN @from AND @to";
    }

    const query = `
      SELECT 
    O.CustomerName,
    O.ContactNo,
    MAX(O.Area) AS Area,

    -- Total Billed (Items + Delivery)
    SUM(ISNULL(OI_Total.OrderSum, 0) + ISNULL(O.DeliveryCharge, 0)) AS TotalDebit,

    -- Total Received (Payment)
    SUM(ISNULL(OP_Total.PaidSum, 0)) AS TotalCredit,

    -- Net Outstanding
    SUM(
        (ISNULL(OI_Total.OrderSum, 0) + ISNULL(O.DeliveryCharge, 0)) 
        - ISNULL(OP_Total.PaidSum, 0)
    ) AS NetBalance

FROM OrdersTemp O WITH (NOLOCK)

OUTER APPLY (
    SELECT SUM(total) AS OrderSum 
    FROM OrderItems 
    WHERE OrderID = O.OrderID
) OI_Total

OUTER APPLY (
    SELECT SUM(Amount) AS PaidSum 
    FROM OrderPayments 
    WHERE OrderID = O.OrderID
) OP_Total

${dateFilter}

GROUP BY O.CustomerName, O.ContactNo

HAVING SUM(
        (ISNULL(OI_Total.OrderSum, 0) + ISNULL(O.DeliveryCharge, 0)) 
        - ISNULL(OP_Total.PaidSum, 0)
    ) <> 0

ORDER BY NetBalance DESC;

    `;

    const request = pool.request();
    if (from && to) {
      request.input("from", from);
      request.input("to", to);
    }

    const result = await request.query(query);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
