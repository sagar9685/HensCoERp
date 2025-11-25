const { sql, poolPromise } = require('../utils/db');

exports.addOrder = async (req, res) => {
  try {
    const {
      CustomerName,
      Address,
      Area,
      ContactNo,
      DeliveryCharge,
      OrderDate,
      Items
    } = req.body;

    if (!Items || !Array.isArray(Items) || Items.length === 0) {
      return res.status(400).json({ message: "Order must contain at least one item." });
    }

    const pool = await poolPromise;

    // Insert into Orders table
    const orderQuery = `
      INSERT INTO OrdersTemp (CustomerName, Address, Area, ContactNo, DeliveryCharge, OrderDate)
      OUTPUT INSERTED.OrderID
      VALUES (@CustomerName, @Address, @Area, @ContactNo, @DeliveryCharge, @OrderDate);
    `;

    const orderRequest = pool.request();
    orderRequest.input("CustomerName", sql.NVarChar, CustomerName);
    orderRequest.input("Address", sql.NVarChar, Address);
    orderRequest.input("Area", sql.NVarChar, Area);
    orderRequest.input("ContactNo", sql.VarChar, ContactNo);
    orderRequest.input("DeliveryCharge", sql.Decimal(10, 2), DeliveryCharge);
    orderRequest.input("OrderDate", sql.Date, OrderDate);

    const result = await orderRequest.query(orderQuery);
    const orderId = result.recordset[0].OrderID;

    // Insert multiple items
    for (let item of Items) {
      const itemQuery = `
        INSERT INTO OrderItems (OrderID, ProductName, ProductType, Weight, Quantity, Rate, Total)
        VALUES (@OrderID, @ProductName, @ProductType, @Weight, @Quantity, @Rate, @Total)
      `;

      const itemReq = pool.request();
      itemReq.input("OrderID", sql.Int, orderId);
      itemReq.input("ProductName", sql.NVarChar, item.ProductName);
      itemReq.input("ProductType", sql.NVarChar, item.ProductType);
      itemReq.input("Weight", sql.NVarChar, item.Weight);
      itemReq.input("Quantity", sql.Int, item.Quantity);
      itemReq.input("Rate", sql.Decimal(10, 2), item.Rate);
      itemReq.input("Total", sql.Decimal(10, 2), item.Quantity * item.Rate);

      await itemReq.query(itemQuery);
    }

    res.status(200).json({
      message: "Order added successfully with multiple items!",
      orderId
    });

  } catch (error) {
    console.error("❌ Error adding order:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

exports.getAllorder = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      
SELECT 
    O.OrderID,
    O.CustomerName,
    O.ContactNo,
    O.Address,
    O.Area,
    O.DeliveryCharge,
    O.OrderDate,

    -- Assignment
    A.AssignID,
    A.DeliveryDate,
    A.DeliveryManID,
    DM.Name AS DeliveryManName,
    A.Remark,
    A.DeliveryStatus AS OrderStatus,
    A.ActualDeliveryDate,
    A.PaymentReceivedDate,

    -- ITEMS (NO DUPLICATE)
    Items.ProductNames,
    Items.ProductTypes,
    Items.Weights,
    Items.Quantities,
    Items.Rates,
    Items.ItemTotals,
    Items.GrandItemTotal,

    -- PAYMENT SUMMARY (NO DUPLICATE)
    Payments.PaymentSummary,
    Payments.TotalPaid

FROM OrdersTemp O
LEFT JOIN AssignedOrders A ON O.OrderID = A.OrderID
LEFT JOIN DeliveryMen DM ON A.DeliveryManID = DM.DeliveryManID

-- ITEM SUBQUERY
OUTER APPLY (
    SELECT 
        STRING_AGG(OI.ProductName, ', ') AS ProductNames,
        STRING_AGG(OI.ProductType, ', ') AS ProductTypes,
        STRING_AGG(CAST(OI.Weight AS VARCHAR(10)), ', ') AS Weights,
        STRING_AGG(CAST(OI.Quantity AS VARCHAR(10)), ', ') AS Quantities,
        STRING_AGG(CAST(OI.Rate AS VARCHAR(10)), ', ') AS Rates,
        STRING_AGG(CAST(OI.Total AS VARCHAR(10)), ', ') AS ItemTotals,
        SUM(OI.Total) AS GrandItemTotal
    FROM OrderItems OI
    WHERE OI.OrderID = O.OrderID
) Items

-- PAYMENT SUBQUERY
OUTER APPLY (
    SELECT 
        'Cash: ' + CAST(ISNULL(SUM(CASE WHEN PM.ModeName = 'Cash' THEN OP.Amount END), 0) AS VARCHAR(20)) +
        ' | GPay: ' + CAST(ISNULL(SUM(CASE WHEN PM.ModeName = 'GPay' THEN OP.Amount END), 0) AS VARCHAR(20)) +
        ' | Paytm: ' + CAST(ISNULL(SUM(CASE WHEN PM.ModeName = 'Paytm' THEN OP.Amount END), 0) AS VARCHAR(20)) +
        ' | FOC: ' + CAST(ISNULL(SUM(CASE WHEN PM.ModeName = 'FOC' THEN OP.Amount END), 0) AS VARCHAR(20)) +
        ' | Bank Transfer: ' + CAST(ISNULL(SUM(CASE WHEN PM.ModeName = 'Bank Transfer' THEN OP.Amount END), 0) AS VARCHAR(20))
        AS PaymentSummary,

        ISNULL(SUM(OP.Amount), 0) AS TotalPaid
    FROM OrderPayments OP
    LEFT JOIN PaymentModes PM ON OP.PaymentModeID = PM.PaymentModeID
    WHERE OP.AssignID = A.AssignID
) Payments

ORDER BY O.OrderID DESC;





    `);

    res.status(200).json(result.recordset);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
