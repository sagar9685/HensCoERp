const { sql, poolPromise } = require("../utils/db");

exports.HeadDailySale = async (req, res) => {
  try {
    const { deliveryBoyId } = req.query;

    // 🔹 Auto date = Today - 1
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1);

    const pool = await poolPromise;
    const request = pool.request();
    request.input("targetDate", sql.Date, targetDate);

    // Optional Delivery Boy filter
    const dbid =
      deliveryBoyId && deliveryBoyId !== "all" && deliveryBoyId !== ""
        ? parseInt(deliveryBoyId)
        : null;

    if (dbid) {
      request.input("dbid", sql.Int, dbid);
    }

    const boyFilter = dbid ? "AND ao.DeliveryManId = @dbid" : "";

    // 🔹 Only ProductType, Weight, Quantity
    const itemsResult = await request.query(`
      SELECT 
        oi.ProductType,
        oi.Weight,
        SUM(oi.Quantity) AS TotalQty
      FROM OrdersTemp o
      JOIN OrderItems oi ON o.OrderID = oi.OrderID
      LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
      WHERE CAST(o.OrderDate AS DATE) = @targetDate
      ${boyFilter}
      GROUP BY oi.ProductType, oi.Weight
      ORDER BY oi.ProductType
    `);

    res.status(200).json({
      date: targetDate,
      reportType: dbid ? `Delivery Boy ID: ${dbid}` : "Full Day Report (All)",
      items: itemsResult.recordset || [],
    });
  } catch (err) {
    console.error("HeadDailySale Error:", err);
    res.status(500).json({ message: "Internal server error in HeadDailySale" });
  }
};
