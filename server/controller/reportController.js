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
      0
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
    
    // Delivery Boy ID handling (Optional)
    // Agar frontend se "all" ya empty string aaye toh null treat karein
    const dbid = (deliveryBoyId && deliveryBoyId !== "all" && deliveryBoyId !== "") 
                 ? parseInt(deliveryBoyId) 
                 : null;

    if (dbid) {
      request.input("dbid", sql.Int, dbid);
    }

    // SQL Filter Fragment
    const boyFilter = dbid ? "AND ao.DeliveryManId = @dbid" : "";

    // 1. Fetch Product Breakdown & Row-wise totals
    // Hum LEFT JOIN use kar rahe hain taaki 'All' mein saare orders aayein
    const itemsResult = await request.query(`
      SELECT 
        oi.ProductType,
        oi.Weight,
        SUM(oi.Quantity) AS Qty,
        oi.Rate,
        SUM(oi.Total) AS Amount
      FROM OrdersTemp o
      JOIN OrderItems oi ON o.OrderID = oi.OrderID
      LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
      WHERE CAST(o.OrderDate AS DATE) = @targetDate
      ${boyFilter}
      GROUP BY oi.ProductType, oi.Weight, oi.Rate
    `);

    // 2. Fetch Payment Breakdown (GPay, Cash, Paytm, FOC)
    const paymentsResult = await request.query(`
      SELECT 
        pm.ModeName,
        SUM(op.Amount) AS ModeTotal
      FROM OrdersTemp o
      JOIN OrderPayments op ON o.OrderID = op.OrderID
      JOIN PaymentModes pm ON pm.PaymentModeID = op.PaymentModeID
      LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
      WHERE CAST(o.OrderDate AS DATE) = @targetDate
      ${boyFilter}
      GROUP BY pm.ModeName
    `);

    const productData = itemsResult.recordset || [];
    const paymentData = paymentsResult.recordset || [];

    // 3. Totals Calculation
    // Yeh values automatically filter ke hisab se calculate hongi
    const totalSaleAmount = productData.reduce((sum, item) => sum + (item.Amount || 0), 0);
    const totalReceived = paymentData.reduce((sum, pay) => sum + (pay.ModeTotal || 0), 0);
    const totalOutstanding = totalSaleAmount - totalReceived;

    // Final Response
    res.status(200).json({
      date,
      reportType: dbid ? `Delivery Boy ID: ${dbid}` : "Full Day Report (All)",
      summary: {
        totalSaleAmount: totalSaleAmount, // Yeh main cheez hai
        totalReceived: totalReceived,
        totalOutstanding: totalOutstanding >= 0 ? totalOutstanding : 0
      },
      products: productData, // Product breakdown (Tray, Box, etc.)
      payments: paymentData  // Payment mode breakdown
    });

  } catch (err) {
    console.error("Daily Report Error:", err);
    res.status(500).json({ message: "Internal server error in Daily Report" });
  }
};