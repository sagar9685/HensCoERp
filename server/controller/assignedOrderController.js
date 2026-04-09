const { sql, poolPromise } = require("../utils/db");
const whatsapp = require("../whatsapp/client"); // Jo client humne banaya tha

// CREATE Assigned Order
// exports.assignOrder = async (req, res) => {
//   const {
//     orderId,
//     deliveryManId,
//     otherDeliveryManName,
//     deliveryDate,
//     remark,
//     username,
//   } = req.body;
//   console.log("ASSIGN ORDER BODY:", req.body);

//   try {
//     const pool = await poolPromise;

//     const check = await pool
//       .request()
//       .input("OrderID", sql.Int, orderId)
//       .query("SELECT AssignID FROM AssignedOrders WHERE OrderID = @OrderID");

//     if (check.recordset.length > 0) {
//       // REASSIGN
//       await pool
//         .request()
//         .input("OrderID", sql.Int, orderId)
//         .input("DeliveryManID", sql.Int, deliveryManId || null)
//         .input(
//           "OtherDeliveryManName",
//           sql.NVarChar,
//           otherDeliveryManName || null,
//         )
//         .input("DeliveryDate", sql.Date, deliveryDate)
//         .input("Remark", sql.NVarChar, remark || null)
//         .input("ReassignedBy", sql.NVarChar, username).query(`
//           UPDATE AssignedOrders
//           SET
//             DeliveryManID = @DeliveryManID,
//             OtherDeliveryManName = @OtherDeliveryManName,
//             DeliveryDate = @DeliveryDate,
//             Remark = @Remark,
//             ReassignedBy = @ReassignedBy
//           WHERE OrderID = @OrderID
//         `);

//       return res.json({ message: "Order reassigned successfully" });
//     } else {
//       // FIRST ASSIGN
//       await pool
//         .request()
//         .input("OrderID", sql.Int, orderId)
//         .input("DeliveryManID", sql.Int, deliveryManId || null)
//         .input(
//           "OtherDeliveryManName",
//           sql.NVarChar,
//           otherDeliveryManName || null,
//         )
//         .input("DeliveryDate", sql.Date, deliveryDate)
//         .input("Remark", sql.NVarChar, remark || null)
//         .input("AssignedBy", sql.NVarChar, username).query(`
//           INSERT INTO AssignedOrders
//           (OrderID, DeliveryManID, OtherDeliveryManName, DeliveryDate, Remark, DeliveryStatus, AssignedBy)
//           VALUES
//           (@OrderID, @DeliveryManID, @OtherDeliveryManName, @DeliveryDate, @Remark, 'Pending', @AssignedBy)
//         `);

//       return res.status(201).json({ message: "Order assigned successfully" });
//     }
//   } catch (err) {
//     console.error("Assign error:", err);
//     res.status(500).json({ message: err.message });
//   }
// };

exports.assignOrder = async (req, res) => {
  const { orderId, deliveryManId, otherDeliveryManName, deliveryDate, remark, username } = req.body;
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    console.log("AssignOrder Start:", { orderId, deliveryManId, deliveryDate });

    // 1️⃣ Check if order already assigned
    const check = await new sql.Request(transaction)
      .input("OrderID", sql.Int, orderId)
      .query("SELECT AssignID FROM AssignedOrders WHERE OrderID = @OrderID");

    if (check.recordset.length > 0) {
      console.log("Order already assigned. Reassigning...");
      await new sql.Request(transaction)
        .input("OrderID", sql.Int, orderId)
        .input("DeliveryManID", sql.Int, deliveryManId || null)
        .input("OtherDeliveryManName", sql.NVarChar, otherDeliveryManName || null)
        .input("DeliveryDate", sql.Date, deliveryDate)
        .input("Remark", sql.NVarChar, remark || null)
        .input("ReassignedBy", sql.NVarChar, username)
        .query(`
          UPDATE AssignedOrders
          SET DeliveryManID=@DeliveryManID,
              OtherDeliveryManName=@OtherDeliveryManName,
              DeliveryDate=@DeliveryDate,
              Remark=@Remark,
              ReassignedBy=@ReassignedBy
          WHERE OrderID=@OrderID
        `);

      await transaction.commit();
      return res.json({ message: "Order reassigned successfully" });
    }

    // 2️⃣ Get items of order
    const itemsRes = await new sql.Request(transaction)
      .input("OrderID", sql.Int, orderId)
      .query(`SELECT ProductType, Quantity FROM OrderItems WHERE OrderID = @OrderID`);

    if (itemsRes.recordset.length === 0) throw new Error("No items found for this order.");

    // 3️⃣ CHECK STOCK USING LOGIC (Opening + Inwards - Sold - Reject)
    for (let item of itemsRes.recordset) {
      const qtyNeeded = parseFloat(item.Quantity || 0);
      const product = item.ProductType ? item.ProductType.trim() : "";

      if (!product || qtyNeeded <= 0) continue;

      // Get available stock from logical calculation
      const stockRes = await new sql.Request(transaction)
        .input("Product", sql.NVarChar, product)
        .query(`
          DECLARE @FixedOpeningDate DATE = '2026-04-01';

          SELECT 
            (ISNULL((SELECT opening_quantity FROM OpeningStock WHERE item_name = @Product), 0) +
             ISNULL((SELECT SUM(quantity) FROM StockHistory WHERE item_name = @Product AND type IN ('IN','RTV') AND CAST(date AS DATE) >= @FixedOpeningDate),0) -
             ISNULL((SELECT SUM(OI.Quantity) 
                     FROM OrderItems OI
                     JOIN OrdersTemp OT ON OT.OrderID = OI.OrderID
                     INNER JOIN AssignedOrders AO ON AO.OrderID = OT.OrderID
                     WHERE OI.ProductType=@Product AND ISNULL(AO.deliveryStatus,'')<>'CANCEL' 
                     AND CAST(OT.OrderDate AS DATE) >= @FixedOpeningDate),0) -
             ISNULL((SELECT SUM(quantity) FROM StockHistory WHERE item_name=@Product AND type='REJECT' AND CAST(date AS DATE) >= @FixedOpeningDate),0)
            ) AS AvailableStock
        `);

      const available = parseFloat(stockRes.recordset[0].AvailableStock || 0);
      console.log(`Available stock for ${product}: ${available}, required: ${qtyNeeded}`);

      if (available < qtyNeeded) {
        throw new Error(`Insufficient stock for ${product}. Required: ${qtyNeeded}, Available: ${available}`);
      }
    }

    // 4️⃣ INSERT INTO AssignedOrders
    await new sql.Request(transaction)
      .input("OrderID", sql.Int, orderId)
      .input("DeliveryManID", sql.Int, deliveryManId || null)
      .input("OtherDeliveryManName", sql.NVarChar, otherDeliveryManName || null)
      .input("DeliveryDate", sql.Date, deliveryDate)
      .input("Remark", sql.NVarChar, remark || null)
      .input("AssignedBy", sql.NVarChar, username)
      .query(`
        INSERT INTO AssignedOrders
        (OrderID, DeliveryManID, OtherDeliveryManName, DeliveryDate, Remark, DeliveryStatus, AssignedBy)
        VALUES
        (@OrderID, @DeliveryManID, @OtherDeliveryManName, @DeliveryDate, @Remark, 'Pending', @AssignedBy)
      `);

    await transaction.commit();
    console.log("Order assigned successfully");
    res.status(201).json({ message: "Order assigned successfully" });

  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error("AssignOrder Error:", err);
    res.status(500).json({ message: err.message });
  }
};
// GET All Assigned Orders
exports.getAssignedOrders = async (req, res) => {
  try {
    const pool = await poolPromise;

    const query = `
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

        -- ITEMS
        Items.ItemIDs,
        Items.ProductNames,
        Items.ProductTypes,
        Items.Weights,
        Items.Quantities,
        Items.Rates,
        Items.MRP,
        Items.ProductUPC,
        Items.ItemTotals,
        Items.GrandItemTotal,

        -- PAYMENT
        Payments.PaymentSummary,
        Payments.TotalPaid

    FROM OrdersTemp O
    LEFT JOIN AssignedOrders A ON O.OrderID = A.OrderID
    LEFT JOIN DeliveryMen DM ON A.DeliveryManID = DM.DeliveryManID

    -- ITEMS SUBQUERY
    OUTER APPLY (
        SELECT 
            STRING_AGG(CAST(OI.ItemID AS VARCHAR(20)), ', ') AS ItemIDs,
            STRING_AGG(OI.ProductName, ', ') AS ProductNames,
            STRING_AGG(OI.ProductType, ', ') AS ProductTypes,
            STRING_AGG(CAST(OI.Weight AS VARCHAR(10)), ', ') AS Weights,
            STRING_AGG(CAST(OI.Quantity AS VARCHAR(10)), ', ') AS Quantities,
            STRING_AGG(CAST(OI.Rate AS VARCHAR(10)), ', ') AS Rates,

            -- ✅ SAFE MAP & UPC
    STRING_AGG(CAST(ISNULL(PT.MRP, 0) AS VARCHAR(20)), ', ') AS MRP,
        STRING_AGG(CAST(ISNULL(PT.ProductUPC, '') AS VARCHAR(50)), ', ') AS ProductUPC,

            STRING_AGG(CAST(OI.Total AS VARCHAR(10)), ', ') AS ItemTotals,
            SUM(OI.Total) AS GrandItemTotal

        FROM OrderItems OI

        -- ✅ IMPORTANT: JOIN FIX (TRY BOTH IF NEEDED)
        LEFT JOIN ProductTypes PT 
            ON OI.ProductType = PT.ProductType
            -- अगर ये match nahi kare to neeche wala try karo:
            -- ON OI.ProductTypeID = PT.ProductTypeID

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
    `;

    const result = await pool.request().query(query);

    res.status(200).json(result.recordset);

  } catch (err) {
    // 🔴 FULL DEBUG
    console.error("❌ SQL ERROR:", err);

    res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

// UPDATE Assigned Order
// e.g. in your assigned orders controller / route

exports.updateAssignedOrder = async (req, res) => {
  const { id } = req.params;
  const {
    deliveryManId,
    otherDeliveryManName,
    deliveryDate,
    remark,
    username,
  } = req.body;

  console.log("BACKEND: Update Request Received for ID:", id);
  console.log("BACKEND: Payload:", req.body);

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("AssignID", sql.Int, id)
      .input("DeliveryManID", sql.Int, deliveryManId || null)
      .input("OtherDeliveryManName", sql.NVarChar, otherDeliveryManName || null)
      .input("DeliveryDate", sql.Date, deliveryDate || null)
      .input("Remark", sql.NVarChar, remark || null)
      .input("ReassignedBy", sql.NVarChar, username || null).query(`
        UPDATE AssignedOrders
        SET
            DeliveryManID = @DeliveryManID,
            OtherDeliveryManName = @OtherDeliveryManName,
            DeliveryDate = @DeliveryDate,
            Remark = @Remark,
            ReassignedBy = @ReassignedBy
        WHERE AssignID = @AssignID
      `);

    console.log("BACKEND: Rows Affected:", result.rowsAffected);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.json({ message: "Assignment updated successfully" });
  } catch (err) {
    console.error("BACKEND ERROR [updateAssignedOrder]:", err.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  const { id } = req.params;
  const { status, username } = req.body;
  console.log("➡️ Status Update Request:", {
    id,
    status,
    username,
  });
  try {
    const pool = await poolPromise;

    let query = `
      UPDATE AssignedOrders
      SET DeliveryStatus = @status
    `;

    if (status === "Complete") {
      query += `,
        ActualDeliveryDate = GETDATE(),
        PaymentReceivedDate = GETDATE(),
        CompletedBy = @username
      `;
    }

    if (status === "Cancel") {
      query += `,
        CancelledBy = @username
      `;
    }

    query += ` WHERE AssignID = @id`;

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("status", sql.NVarChar, status)
      .input("username", sql.NVarChar, username)
      .query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.json({
      assignId: id,
      status,
      message: "Delivery status updated",
    });
  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ message: err.message });
  }
};
