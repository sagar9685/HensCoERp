const { sql, poolPromise } = require("../utils/db");

/* =======================
   MONTHLY REPORT
======================= */
exports.getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;

    const pool = await poolPromise;

    const summary = await pool.request()
      .input("year", sql.Int, year)
      .input("month", sql.Int, month)
      .query(`
        SELECT 
          COUNT(DISTINCT o.OrderID) TotalOrders,
          SUM(oi.Total) TotalSales
        FROM OrdersTemp o
        JOIN OrderItems oi ON o.OrderID = oi.OrderID
        WHERE YEAR(o.OrderDate)=@year
        AND MONTH(o.OrderDate)=@month
      `);

    const payment = await pool.request()
      .input("year", sql.Int, year)
      .input("month", sql.Int, month)
      .query(`
        SELECT pm.ModeName, SUM(op.Amount) Amount
        FROM OrderPayments op
        JOIN PaymentModes pm ON pm.PaymentModeID=op.PaymentModeID
        JOIN OrdersTemp o ON o.OrderID=op.OrderID
        WHERE YEAR(o.OrderDate)=@year
        AND MONTH(o.OrderDate)=@month
        GROUP BY pm.ModeName
      `);

    res.status(200).json({
      summary: summary.recordset[0],
      payment: payment.recordset
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* =======================
   WEEKLY REPORT
======================= */
exports.getWeeklyReport = async (req, res) => {
  try {
    const { month, from, to } = req.query;

    const pool = await poolPromise;

    const result = await pool.request()
      .input("month", sql.Int, month)
      .input("from", sql.Int, from)
      .input("to", sql.Int, to)
      .query(`
        SELECT 
          CAST(o.OrderDate AS DATE) OrderDate,
          COUNT(DISTINCT o.OrderID) Orders,
          SUM(oi.Total) Sales
        FROM OrdersTemp o
        JOIN OrderItems oi ON o.OrderID=oi.OrderID
        WHERE MONTH(o.OrderDate)=@month
        AND DAY(o.OrderDate) BETWEEN @from AND @to
        GROUP BY CAST(o.OrderDate AS DATE)
        ORDER BY OrderDate
      `);

    res.status(200).json(result.recordset);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
