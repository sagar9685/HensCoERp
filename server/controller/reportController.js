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
