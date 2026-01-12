const { sql, poolPromise } = require("../utils/db");

// 1️⃣ Area wise total orders
exports.areaWiseOrders = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT Area, COUNT(*) AS TotalOrders
      FROM OrdersTemp
      GROUP BY Area
      ORDER BY TotalOrders DESC
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2️⃣ Area wise sales
exports.areaWiseSales = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT o.Area, SUM(i.Total) AS TotalSales
      FROM OrdersTemp o
      JOIN orderItems i ON o.OrderID = i.OrderID
      GROUP BY o.Area
      ORDER BY TotalSales DESC
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3️⃣ Area + Customer behavior
exports.areaCustomerAnalysis = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT o.Area, o.CustomerName, COUNT(DISTINCT o.OrderID) AS TotalOrders
      FROM OrdersTemp o
      GROUP BY o.Area, o.CustomerName
      ORDER BY o.Area, TotalOrders DESC
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4️⃣ Month wise total orders
exports.monthWiseOrders = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT MONTH(OrderDate) AS OrderMonth, COUNT(*) AS TotalOrders
      FROM OrdersTemp
      GROUP BY MONTH(OrderDate)
      ORDER BY TotalOrders DESC
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 5️⃣ Month wise sales
exports.monthWiseSales = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT MONTH(o.OrderDate) AS OrderMonth, SUM(i.Total) AS TotalSales
      FROM OrdersTemp o
      JOIN orderItems i ON o.OrderID = i.OrderID
      GROUP BY MONTH(o.OrderDate)
      ORDER BY TotalSales DESC
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 6️⃣ Customer best month
exports.customerBestMonth = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      WITH cte AS (
        SELECT o.CustomerName,
               MONTH(o.OrderDate) AS OrderMonth,
               COUNT(DISTINCT o.OrderID) AS TotalOrders
        FROM OrdersTemp o
        GROUP BY o.CustomerName, MONTH(o.OrderDate)
      )
      SELECT CustomerName, OrderMonth, TotalOrders
      FROM (
        SELECT *, RANK() OVER (PARTITION BY CustomerName ORDER BY TotalOrders DESC) r
        FROM cte
      ) x
      WHERE r = 1
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 7️⃣ Product type wise sales
exports.productTypeSales = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT ProductType, SUM(Total) AS TotalSales
      FROM orderItems
      GROUP BY ProductType
      ORDER BY TotalSales DESC
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.topCustomersByRevenue = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
     SELECT TOP 10
    o.CustomerName,
    SUM(i.Total) AS TotalSpent
FROM OrdersTemp o
JOIN orderItems i ON o.OrderID = i.OrderID
GROUP BY o.CustomerName
ORDER BY TotalSpent DESC;

    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2️⃣ Best Area by Revenue
exports.bestAreaByRevenue = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        o.Area,
        SUM(i.Total) AS Revenue
      FROM OrdersTemp o
      JOIN orderItems i ON o.OrderID = i.OrderID
      GROUP BY o.Area
      ORDER BY Revenue DESC
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3️⃣ Month to Month Sales Growth
exports.monthlySalesGrowth = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        MONTH(o.OrderDate) AS OrderMonth,
        SUM(i.Total) AS Sales
      FROM OrdersTemp o
      JOIN orderItems i ON o.OrderID = i.OrderID
      GROUP BY MONTH(o.OrderDate)
      ORDER BY OrderMonth
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
