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

 
exports.getDeliverySummaryByDateAndBoy = async (req, res) => {
  const { fromDeliveryDate, toDeliveryDate, deliveryManId } = req.body;

  // 🔹 Validation
  if (!fromDeliveryDate || !toDeliveryDate) {
    return res.status(400).json({
      success: false,
      message: "fromDeliveryDate and toDeliveryDate are required",
    });
  }

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("FromDeliveryDate", sql.Date, fromDeliveryDate)
      .input("ToDeliveryDate", sql.Date, toDeliveryDate)
      .input("DeliveryManID", sql.Int, deliveryManId ?? null)
      .query(`
/* ================= DELIVERY SUMMARY QUERY ================= */

SELECT 
    O.OrderID,
    O.CustomerName,
    O.ContactNo,
    O.Address,
    O.Area,
    O.DeliveryCharge,
    O.OrderDate,

    A.AssignID,
    A.DeliveryDate,
    A.PaymentReceivedDate,
    DM.Name AS DeliveryBoyName,

    -- ITEMS
    IT.Items,
    IT.TotalQty,
    IT.Weights,
    IT.Rates,
    IT.ItemsTotal,

    -- PAYMENTS
    ISNULL(PAY.Cash,0) AS Cash,
    ISNULL(PAY.GPay,0) AS GPay,
    ISNULL(PAY.Paytm,0) AS Paytm,
    ISNULL(PAY.FOC,0) AS FOC,
    ISNULL(PAY.BankTransfer,0) AS BankTransfer,

    -- FINAL TOTAL
    IT.ItemsTotal + ISNULL(O.DeliveryCharge,0) AS OrderTotal

FROM AssignedOrders A
JOIN OrdersTemp O ON A.OrderID = O.OrderID
LEFT JOIN DeliveryMen DM ON A.DeliveryManID = DM.DeliveryManID

/* 🔹 ITEM AGGREGATION */
LEFT JOIN (
    SELECT 
        OrderID,
        STRING_AGG(ProductName, ', ') AS Items,
        SUM(Quantity) AS TotalQty,
        STRING_AGG(CAST(Weight AS VARCHAR(10)), ', ') AS Weights,
        STRING_AGG(CAST(Rate AS VARCHAR(10)), ', ') AS Rates,
        SUM(Total) AS ItemsTotal
    FROM OrderItems
    GROUP BY OrderID
) IT ON IT.OrderID = O.OrderID

/* 🔹 PAYMENT AGGREGATION */
LEFT JOIN (
    SELECT 
        OP.AssignID,
        SUM(CASE WHEN PM.ModeName = 'Cash' THEN OP.Amount ELSE 0 END) AS Cash,
        SUM(CASE WHEN PM.ModeName = 'GPay' THEN OP.Amount ELSE 0 END) AS GPay,
        SUM(CASE WHEN PM.ModeName = 'Paytm' THEN OP.Amount ELSE 0 END) AS Paytm,
        SUM(CASE WHEN PM.ModeName = 'FOC' THEN OP.Amount ELSE 0 END) AS FOC,
        SUM(CASE WHEN PM.ModeName = 'Bank Transfer' THEN OP.Amount ELSE 0 END) AS BankTransfer
    FROM OrderPayments OP
    JOIN PaymentModes PM ON OP.PaymentModeID = PM.PaymentModeID
    GROUP BY OP.AssignID
) PAY ON PAY.AssignID = A.AssignID

WHERE 
    A.DeliveryDate BETWEEN @FromDeliveryDate AND @ToDeliveryDate
    AND (@DeliveryManID IS NULL OR A.DeliveryManID = @DeliveryManID)

ORDER BY A.DeliveryDate DESC, O.OrderID DESC;
      `);

    // 🔹 SUMMARY CALCULATION (SAFE)
    const summary = result.recordset.reduce(
      (acc, r) => {
        acc.totalSales += r.OrderTotal || 0;
        acc.cash += r.Cash || 0;
        acc.gpay += r.GPay || 0;
        acc.paytm += r.Paytm || 0;
        acc.foc += r.FOC || 0;
        acc.bank += r.BankTransfer || 0;
        return acc;
      },
      {
        totalSales: 0,
        cash: 0,
        gpay: 0,
        paytm: 0,
        foc: 0,
        bank: 0,
      }
    );

    return res.status(200).json({
      success: true,
      fromDeliveryDate,
      toDeliveryDate,
      deliveryManId,
      totalOrders: result.recordset.length,
      summary,
      orders: result.recordset,
    });

  } catch (error) {
    console.error("Delivery Summary API Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
