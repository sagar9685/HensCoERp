const { sql, poolPromise } = require("../utils/db");


// CREATE Assigned Order
exports.assignOrder = async (req, res) => {
  const { 
    orderId, 
    deliveryManId, 
    otherDeliveryManName,  
    deliveryDate,
    remark 
  } = req.body;

  // Required fields check
  if (!orderId  || !deliveryDate) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  // Delivery man validation
  if (!deliveryManId && !otherDeliveryManName) {
    return res.status(400).json({ message: "Select delivery man or enter other name" });
  }

  try {
    const pool = await poolPromise;

    await pool.request()
      .input("OrderID", sql.Int, orderId)
      .input("DeliveryManID", sql.Int, deliveryManId || null)
      .input("OtherDeliveryManName", sql.NVarChar, otherDeliveryManName || null)
     
      .input("DeliveryDate", sql.Date, deliveryDate)
      .input("Remark", sql.NVarChar, remark || null)
      .query(`
        INSERT INTO AssignedOrders 
          (OrderID, DeliveryManID, OtherDeliveryManName, DeliveryDate, Remark)
          
        VALUES 
          (@OrderID, @DeliveryManID, @OtherDeliveryManName, @DeliveryDate, @Remark)
      `);

    res.status(201).json({ message: "Order assigned successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};




// GET All Assigned Orders
exports.getAssignedOrders = async (req, res) => {
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



// UPDATE Assigned Order
exports.updateAssignedOrder = async (req, res) => {
  const { id } = req.params;
  const { 
    deliveryManId, 
    otherDeliveryManName,
    paymentModeId,
    deliveryDate,
    remark
  } = req.body;

  try {
    const pool = await poolPromise;

    await pool.request()
      .input("AssignID", sql.Int, id)
      .input("DeliveryManID", sql.Int, deliveryManId || null)
      .input("OtherDeliveryManName", sql.NVarChar, otherDeliveryManName || null)
      .input("PaymentModeID", sql.Int, paymentModeId)
      .input("DeliveryDate", sql.Date, deliveryDate)
      .input("Remark", sql.NVarChar, remark)
      .query(`
        UPDATE AssignedOrders
        SET 
          DeliveryManID = @DeliveryManID,
          OtherDeliveryManName = @OtherDeliveryManName,
          PaymentModeID = @PaymentModeID,
          DeliveryDate = @DeliveryDate,
          Remark = @Remark
        WHERE AssignID = @AssignID
      `);

    res.status(200).json({ message: "Assigned order updated successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
