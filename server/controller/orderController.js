const { sql, poolPromise } = require("../utils/db");

exports.addOrder = async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    const {
      CustomerName,
      Address,
      Area,
      ContactNo,
      DeliveryCharge,
      OrderDate,
      OrderTakenBy,
      Items,
    } = req.body;

    if (!Items || !Array.isArray(Items) || Items.length === 0) {
      return res
        .status(400)
        .json({ message: "Order must contain at least one item." });
    }

    await transaction.begin();

    const request = new sql.Request(transaction);

    const orderDt = new Date(OrderDate);
    const year = orderDt.getFullYear();
    const month = orderDt.getMonth() + 1;
    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = month >= 4 ? year + 1 : year;
    const fyString = `${fyStart % 100}-${fyEnd % 100}`;

    const lastInvoiceResult = await request.query(`
      SELECT TOP 1 InvoiceNo 
      FROM OrdersTemp
      WHERE InvoiceNo LIKE '${fyString}/%'
      ORDER BY OrderID DESC;
    `);
    let nextSequence = 1;
    if (lastInvoiceResult.recordset.length > 0) {
      const lastInvoice = lastInvoiceResult.recordset[0].InvoiceNo;
      const lastSeq = parseInt(lastInvoice.split("/")[1]);
      nextSequence = lastSeq + 1;
    }
    const invoiceNo = `${fyString}/${String(nextSequence).padStart(2, "0")}`;

    // ----------------- 3️⃣ INSERT ORDER -----------------
    request.input("CustomerName", sql.NVarChar, CustomerName);
    request.input("Address", sql.NVarChar, Address);
    request.input("Area", sql.NVarChar, Area);
    request.input("ContactNo", sql.VarChar, ContactNo);
    request.input("DeliveryCharge", sql.Decimal(10, 2), DeliveryCharge);
    request.input("OrderDate", sql.Date, OrderDate);
    request.input("OrderTakenBy", sql.NVarChar, OrderTakenBy);
    request.input("InvoiceNo", sql.NVarChar, invoiceNo);

    const orderInsertResult = await request.query(`
      INSERT INTO OrdersTemp 
      (CustomerName, Address, Area, ContactNo, DeliveryCharge, OrderDate, OrderTakenBy, InvoiceNo)
      OUTPUT INSERTED.OrderID
      VALUES (@CustomerName, @Address, @Area, @ContactNo, @DeliveryCharge, @OrderDate, @OrderTakenBy, @InvoiceNo);
    `);

    const orderId = orderInsertResult.recordset[0].OrderID;

    // ----------------- 4️⃣ PROCESS ITEMS & STOCK -----------------
    for (let item of Items) {
      let remainingQty = item.Quantity;

      // Fetch stock rows (FIFO)
      const stockRowsResult = await transaction
        .request()
        .input("ProductType", sql.NVarChar, item.ProductType).query(`
          SELECT ID, Quantity 
          FROM Stock
          WHERE item_name = @ProductType AND Quantity > 0
          ORDER BY ID ASC
        `);

      const stockRows = stockRowsResult.recordset;

      for (let stockRow of stockRows) {
        if (remainingQty <= 0) break;

        const deductQty = Math.min(stockRow.Quantity, remainingQty);

        await transaction
          .request()
          .input("DeductQty", sql.Int, deductQty)
          .input("ID", sql.Int, stockRow.ID).query(`
            UPDATE Stock
            SET Quantity = Quantity - @DeductQty
            WHERE ID = @ID
          `);

        remainingQty -= deductQty;
      }

      if (remainingQty > 0) {
        throw new Error(
          `Not enough stock for ${item.ProductType}. Remaining ${remainingQty}`
        );
      }

      // Insert order item
      await transaction
        .request()
        .input("OrderID", sql.Int, orderId)
        .input("ProductName", sql.NVarChar, item.ProductName)
        .input("ProductType", sql.NVarChar, item.ProductType)
        .input("Weight", sql.NVarChar, item.Weight || "")
        .input("Quantity", sql.Int, item.Quantity)
        .input("Rate", sql.Decimal(10, 2), item.Rate)
        .input("Total", sql.Decimal(10, 2), item.Quantity * item.Rate).query(`
          INSERT INTO OrderItems 
          (OrderID, ProductName, ProductType, Weight, Quantity, Rate, Total)
          VALUES (@OrderID, @ProductName, @ProductType, @Weight, @Quantity, @Rate, @Total)
        `);
    }

    await transaction.commit(); // ✅ Commit only after all inserts & stock updates succeed

    res.status(200).json({
      message: "Order placed & stock updated safely!",
      orderId,
      invoiceNo,
    });
  } catch (error) {
    await transaction.rollback(); // 🔴 Rollback if any error
    console.error("❌ Error adding order:", error);
    res.status(500).json({
      message: error.message || "Internal server error",
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
    O.OrderTakenBy,
       O.InvoiceNo,

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
    Items.ProductNames,
    Items.ProductTypes,
    Items.Weights,
    Items.Quantities,
    Items.Rates,
    Items.ItemTotals,
    Items.GrandItemTotal,

    -- PAYMENTS
    Payments.PaymentID,               -- ✅ ADD THIS
    Payments.PaymentSummary,
    Payments.TotalPaid,
    Payments.PaymentVerifyStatus,
    Payments.ShortAmount

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
        MAX(OP.PaymentID) AS PaymentID,

        -- PAYMENT SUMMARY
        'Cash: ' + CAST(ISNULL(SUM(CASE WHEN PM.ModeName = 'Cash' THEN OP.Amount END),0) AS VARCHAR(20)) +
        ' | GPay: ' + CAST(ISNULL(SUM(CASE WHEN PM.ModeName = 'GPay' THEN OP.Amount END),0) AS VARCHAR(20)) +
        ' | Paytm: ' + CAST(ISNULL(SUM(CASE WHEN PM.ModeName = 'Paytm' THEN OP.Amount END),0) AS VARCHAR(20)) +
        ' | FOC: ' + CAST(ISNULL(SUM(CASE WHEN PM.ModeName = 'FOC' THEN OP.Amount END),0) AS VARCHAR(20)) +
        ' | Bank Transfer: ' + CAST(ISNULL(SUM(CASE WHEN PM.ModeName = 'Bank Transfer' THEN OP.Amount END),0) AS VARCHAR(20)) 
        AS PaymentSummary,

        -- TOTAL PAID
        ISNULL(SUM(OP.Amount),0) AS TotalPaid,

        -- TOTAL SHORT AMOUNT
        ISNULL(SUM(OP.ShortAmount),0) AS ShortAmount,

        -- MODE-WISE VERIFY STATUS
        'Verified' AS CashVerifyStatus,

        MAX(CASE WHEN PM.ModeName = 'GPay' THEN 'Verified' END) AS GPayVerifyStatus,
        MAX(CASE WHEN PM.ModeName = 'Paytm' THEN 'Verified' END) AS PaytmVerifyStatus,
        MAX(CASE WHEN PM.ModeName = 'Bank Transfer' THEN 'Verified' END) AS BankVerifyStatus,
        MAX(CASE WHEN PM.ModeName = 'FOC' THEN 'Verified' END) AS FOCVerifyStatus,

        -- ⭐ REAL DB VERIFIED STATUS (NOT OVERRIDDEN)
        MAX(OP.PaymentVerifyStatus) AS PaymentVerifyStatus

    FROM OrderPayments OP
    LEFT JOIN PaymentModes PM 
        ON OP.PaymentModeID = PM.PaymentModeID
    WHERE OP.AssignID = A.AssignID
) Payments



ORDER BY O.OrderID DESC


    `);

    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOrderTakenByList = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT Name FROM OrderTakenByList
    `);

    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch names" });
  }
};

exports.cancelOrder = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  console.log("➡️ Cancel request for AssignID:", id);
  console.log("➡️ Reason:", reason);

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    console.log("✅ Transaction started");

    // 1️⃣ Check Assigned Order
    const check = await transaction.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT DeliveryStatus, OrderID
        FROM AssignedOrders
        WHERE AssignID = @id
      `);

    console.log("🔍 AssignedOrder check:", check.recordset);

    if (check.recordset.length === 0) {
      throw new Error("Invalid AssignID");
    }

    if (check.recordset[0].DeliveryStatus === "Cancel") {
      throw new Error("Order already cancelled");
    }

    const orderId = check.recordset[0].OrderID;

    // 2️⃣ Update AssignedOrders → Cancel
    const updateRes = await transaction.request()
      .input("id", sql.Int, id)
      .input("reason", sql.NVarChar, reason || "Cancelled")
      .query(`
        UPDATE AssignedOrders
        SET DeliveryStatus = 'Cancel',
            CompletionRemarks = @reason
        WHERE AssignID = @id
      `);

    console.log("✅ Order update rows:", updateRes.rowsAffected);

    // 3️⃣ Get Order Items
    const itemsResult = await transaction.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        SELECT ProductType, Quantity
        FROM OrderItems
        WHERE OrderID = @orderId
      `);

    // 4️⃣ Revert Stock (FIFO – update only, no insert)
    for (let item of itemsResult.recordset) {
      const stockResult = await transaction.request()
        .input("itemName", sql.NVarChar, item.ProductType)
        .query(`
          SELECT TOP 1 ID
          FROM Stock
          WHERE item_name = @itemName
          ORDER BY ID ASC
        `);

      if (stockResult.recordset.length === 0) {
        throw new Error(`Stock not found for ${item.ProductType}`);
      }

      const stockId = stockResult.recordset[0].ID;

      await transaction.request()
        .input("qty", sql.Int, item.Quantity)
        .input("id", sql.Int, stockId)
        .query(`
          UPDATE Stock
          SET Quantity = Quantity + @qty
          WHERE ID = @id
        `);
    }

    await transaction.commit();
    console.log("✅ Transaction committed");

    res.json({ message: "Order cancelled & stock reverted" });

  } catch (err) {
    console.error("❌ Cancel Order Error:", err.message);
    await transaction.rollback();
    console.log("↩️ Transaction rolled back");

    res.status(500).json({ message: err.message });
  }
};
