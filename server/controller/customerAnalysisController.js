const { sql, poolPromise } = require("../utils/db");

/**
 * WEEK WISE CUSTOMER ORDER FREQUENCY
 */
exports.getCustomerOrderFrequencyWeekWise = async (req, res) => {
  try {
    const pool = await poolPromise;

    const query = `
      SELECT 
        CustomerName,
        YEAR(OrderDate) AS OrderYear,
        DATEPART(WEEK, OrderDate) AS OrderWeek,
        COUNT(*) AS TotalOrders
      FROM OrdersTemp
      GROUP BY 
        CustomerName,
        YEAR(OrderDate),
        DATEPART(WEEK, OrderDate)
      ORDER BY OrderYear DESC, OrderWeek DESC
    `;

    const result = await pool.request().query(query);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Week wise analysis error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * MONTH WISE CUSTOMER ORDER FREQUENCY
 */
exports.getCustomerOrderFrequencyMonthWise = async (req, res) => {
  try {
    const pool = await poolPromise;

    const query = `
      SELECT 
        CustomerName,
        YEAR(OrderDate) AS OrderYear,
        MONTH(OrderDate) AS OrderMonth,
        COUNT(*) AS TotalOrders
      FROM OrdersTemp
      GROUP BY 
        CustomerName,
        YEAR(OrderDate),
        MONTH(OrderDate)
      ORDER BY OrderYear DESC, OrderMonth DESC
    `;

    const result = await pool.request().query(query);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Month wise analysis error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * YEAR WISE CUSTOMER ORDER FREQUENCY
 */
exports.getCustomerOrderFrequencyYearWise = async (req, res) => {
  try {
    const pool = await poolPromise;

    const query = `
      SELECT 
        CustomerName,
        YEAR(OrderDate) AS OrderYear,
        COUNT(*) AS TotalOrders
      FROM OrdersTemp
      GROUP BY 
        CustomerName,
        YEAR(OrderDate)
      ORDER BY OrderYear DESC
    `;

    const result = await pool.request().query(query);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Year wise analysis error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
