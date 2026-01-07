const { sql, poolPromise } = require("../utils/db");

exports.getDeliveryMen = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM DeliveryMen");
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDeliveryMenCash = async (req, res) => {
  try {
    const pool = await poolPromise;

    const query = `
SELECT 
    DM.DeliveryManID,
    DM.Name,
    DM.MobileNo,
    DM.Area,
    C.CurrentBalance AS TotalCash
FROM DeliveryMen DM
LEFT JOIN DeliveryMenCashBalance C
    ON DM.DeliveryManID = C.DeliveryManID
`;

    const result = await pool.request().query(query);

    return res.status(200).json({
      success: true,
      message: "Delivery men cash fetched successfully",
      data: result.recordset,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

exports.addDeliveryMan = async (req, res) => {
  const { name } = req.body;

  if (!name) return res.status(400).json({ message: "Name is required" });

  try {
    const pool = await poolPromise;

    await pool
      .request()
      .input("Name", sql.NVarChar, name)
      .query("INSERT INTO DeliveryMen (Name) VALUES (@Name)");

    res.status(201).json({ message: "Delivery man added successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDeliveryManPendingCashOrders = async (req, res) => {
  try {
    const { deliveryManId } = req.params;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("DeliveryManID", sql.Int, deliveryManId).query(`
       SELECT 
    DM.Name AS DeliveryManName,
    O.OrderID,
    O.InvoiceNo,
    O.OrderDate,
    O.CustomerName,
    O.Area,
    O.Address,
    O.ContactNo,
    O.DeliveryCharge,
    A.AssignID,
    A.ActualDeliveryDate,
    OI.ProductType,
    OI.Weight,
    OI.Quantity,
    OI.Rate,
    OP.PaymentID,
    SUM(OP.Amount) AS CashAmount,
    MAX(OP.PaymentReceivedDate) AS PaymentDate
FROM AssignedOrders A
JOIN OrdersTemp O ON O.OrderID = A.OrderID
JOIN DeliveryMen DM ON DM.DeliveryManID = A.DeliveryManID
JOIN OrderPayments OP ON OP.AssignID = A.AssignID
JOIN OrderItems OI ON OI.OrderID = O.OrderID
JOIN PaymentModes PM ON PM.PaymentModeID = OP.PaymentModeID
WHERE 
    PM.ModeName = 'Cash'
    AND OP.IsHandovered = 0
    AND A.DeliveryManID = @DeliveryManID
GROUP BY 
    DM.Name,
    O.OrderID,
    O.InvoiceNo,
    O.OrderDate,
    O.CustomerName,
    O.Area,
     O.Address,
    O.ContactNo,
    O.DeliveryCharge,
    A.AssignID,
    A.ActualDeliveryDate,
    OI.ProductType,
    OI.Weight,
    OI.Quantity,
    OI.Rate,
    OP.PaymentID
ORDER BY PaymentDate DESC;

      `);

    res.status(200).json({
      success: true,
      totalCash: result.recordset.reduce((s, i) => s + i.CashAmount, 0),
      orders: result.recordset,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
