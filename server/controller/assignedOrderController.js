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
  const {
    orderId,
    deliveryManId,
    otherDeliveryManName,
    deliveryDate,
    remark,
    username,
  } = req.body;

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1️⃣ Check if order already assigned
    const check = await new sql.Request(transaction)
      .input("OrderID", sql.Int, orderId)
      .query("SELECT AssignID FROM AssignedOrders WHERE OrderID = @OrderID");

    if (check.recordset.length > 0) {
      // REASSIGN
      await new sql.Request(transaction)
        .input("OrderID", sql.Int, orderId)
        .input("DeliveryManID", sql.Int, deliveryManId || null)
        .input(
          "OtherDeliveryManName",
          sql.NVarChar,
          otherDeliveryManName || null,
        )
        .input("DeliveryDate", sql.Date, deliveryDate)
        .input("Remark", sql.NVarChar, remark || null)
        .input("ReassignedBy", sql.NVarChar, username).query(`
          UPDATE AssignedOrders
          SET 
            DeliveryManID = @DeliveryManID,
            OtherDeliveryManName = @OtherDeliveryManName,
            DeliveryDate = @DeliveryDate,
            Remark = @Remark,
            ReassignedBy = @ReassignedBy
          WHERE OrderID = @OrderID
        `);

      await transaction.commit();
      return res.json({ message: "Order reassigned successfully" });
    }

    // 2️⃣ Insert new assignment
    await new sql.Request(transaction)
      .input("OrderID", sql.Int, orderId)
      .input("DeliveryManID", sql.Int, deliveryManId || null)
      .input("OtherDeliveryManName", sql.NVarChar, otherDeliveryManName || null)
      .input("DeliveryDate", sql.Date, deliveryDate)
      .input("Remark", sql.NVarChar, remark || null)
      .input("AssignedBy", sql.NVarChar, username).query(`
        INSERT INTO AssignedOrders 
        (OrderID, DeliveryManID, OtherDeliveryManName, DeliveryDate, Remark, DeliveryStatus, AssignedBy)
        VALUES 
        (@OrderID, @DeliveryManID, @OtherDeliveryManName, @DeliveryDate, @Remark, 'Pending', @AssignedBy)
      `);

    // 3️⃣ Get items of order
    const itemsRes = await new sql.Request(transaction).input(
      "OrderID",
      sql.Int,
      orderId,
    ).query(`
        SELECT ProductType, Quantity 
        FROM OrderItems 
        WHERE OrderID = @OrderID
      `);

    // 4️⃣ Deduct stock
    for (let item of itemsRes.recordset) {
      let qtyToDeduct = parseInt(item.Quantity);
      const target = item.ProductType.trim();

      const stockRes = await new sql.Request(transaction).input(
        "Target",
        sql.NVarChar,
        target,
      ).query(`
          SELECT id, quantity 
          FROM Stock 
          WHERE LTRIM(RTRIM(item_name)) = @Target
          AND quantity > 0
          ORDER BY id ASC
        `);

      for (let stockRow of stockRes.recordset) {
        if (qtyToDeduct <= 0) break;

        const deductQty = Math.min(stockRow.quantity, qtyToDeduct);

        await new sql.Request(transaction)
          .input("ID", sql.Int, stockRow.id)
          .input("D", sql.Int, deductQty).query(`
            UPDATE Stock 
            SET quantity = quantity - @D 
            WHERE id = @ID
          `);

        qtyToDeduct -= deductQty;
      }

      if (qtyToDeduct > 0) {
        throw new Error(`${target} out of stock`);
      }
    }

    await transaction.commit();
    res.status(201).json({ message: "Order assigned successfully" });
  } catch (err) {
    await transaction.rollback();
    console.error("AssignOrder Error:", err);
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
    A.PaymentReceivedDate,

    -- ITEMS (NO DUPLICATE)
    Items.ItemIDs,
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
     STRING_AGG(CAST(OI.ItemID AS VARCHAR(20)), ', ') AS ItemIDs,
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
