const { sql, poolPromise } = require("../utils/db");


// CREATE Assigned Order
exports.assignOrder = async (req, res) => {
  const { 
    orderId, 
    deliveryManId, 
    otherDeliveryManName, 
    paymentModeId, 
    deliveryDate,
    remark 
  } = req.body;

  // Required fields check
  if (!orderId || !paymentModeId || !deliveryDate) {
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
      .input("PaymentModeID", sql.Int, paymentModeId)
      .input("DeliveryDate", sql.Date, deliveryDate)
      .input("Remark", sql.NVarChar, remark || null)
      .query(`
        INSERT INTO AssignedOrders 
          (OrderID, DeliveryManID, OtherDeliveryManName, PaymentModeID, DeliveryDate, Remark)
          
        VALUES 
          (@OrderID, @DeliveryManID, @OtherDeliveryManName, @PaymentModeID, @DeliveryDate, @Remark)
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
    AO.AssignID,
    AO.OrderID,

    -- Delivery Man: show dropdown name or other name
    COALESCE(DM.Name, AO.OtherDeliveryManName) AS DeliveryManName,

    PM.ModeName AS PaymentMode,
    AO.DeliveryDate,
    AO.Remark,
    AO.AssignedAt,

    -- Order details
    O.ProductName,
    O.ProductType,
    O.Weight,
    O.Quantity,
    O.Rate,
    O.DeliveryCharge,
    O.CustomerName,
    O.Address,
    O.Area,
    O.ContactNo,
    O.OrderDate

FROM AssignedOrders AO
LEFT JOIN DeliveryMen DM ON AO.DeliveryManID = DM.DeliveryManID
JOIN PaymentModes PM ON AO.PaymentModeID = PM.PaymentModeID
JOIN Orders O ON AO.OrderID = O.OrderID

ORDER BY AO.AssignID DESC;
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
