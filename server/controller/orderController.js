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
      InvoiceDate,
      OrderTakenBy,
      Items,
      Po_No,
      Po_Date,
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
    request.input("InvoiceDate", sql.Date, InvoiceDate || OrderDate);
    request.input("OrderTakenBy", sql.NVarChar, OrderTakenBy);
    request.input("InvoiceNo", sql.NVarChar, invoiceNo);
    request.input("Po_No", sql.NVarChar, Po_No);
    request.input("Po_Date", sql.Date, Po_Date);

    const orderInsertResult = await request.query(`
      INSERT INTO OrdersTemp 
      (CustomerName, Address, Area, ContactNo, DeliveryCharge, OrderDate, InvoiceDate, OrderTakenBy, InvoiceNo, Po_No , Po_Date)
      OUTPUT INSERTED.OrderID
      VALUES (@CustomerName, @Address, @Area, @ContactNo, @DeliveryCharge, @OrderDate, @InvoiceDate, @OrderTakenBy, @InvoiceNo, @Po_No, @Po_Date);
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
          `Not enough stock for ${item.ProductType}. Remaining ${remainingQty}`,
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
        O.OrderID, O.CustomerName, O.ContactNo, O.Address, O.Area,
        C.Gst_No, C.PAN_No, O.DeliveryCharge, O.OrderDate, O.OrderTakenBy,
        O.InvoiceNo, O.Po_No, O.Po_Date, O.InvoiceDate, 
        A.AssignID, A.DeliveryDate, A.DeliveryManID, DM.Name AS DeliveryManName,
        A.Remark, A.DeliveryStatus AS OrderStatus, A.ActualDeliveryDate, A.PaymentReceivedDate,
         Items.ItemIDs, Items.ProductNames, Items.ProductTypes, Items.ProductUPCs, Items.MRPs,
        Items.Weights, Items.Quantities, Items.Rates, Items.ItemTotals, Items.GrandItemTotal,
        Payments.PaymentID, Payments.PaymentSummary, Payments.TotalPaid,
        Payments.PaymentVerifyStatus,Payments.VerifyMark, Payments.ShortAmount
      FROM OrdersTemp O WITH (NOLOCK) -- ⭐ Added NOLOCK
      OUTER APPLY (
          SELECT TOP 1 *
          FROM Customers C WITH (NOLOCK) -- ⭐ Added NOLOCK
          WHERE O.CustomerName = C.CustomerName
            AND O.ContactNo = C.Contact_No
          ORDER BY C.CustomerID DESC
      ) C
      LEFT JOIN AssignedOrders A WITH (NOLOCK) ON O.OrderID = A.OrderID -- ⭐ Added NOLOCK
      LEFT JOIN DeliveryMen DM WITH (NOLOCK) ON A.DeliveryManID = DM.DeliveryManID -- ⭐ Added NOLOCK

      OUTER APPLY (
          SELECT 
          STRING_AGG(CAST(OI.ItemID AS VARCHAR(20)), ', ') AS ItemIDs,
              STRING_AGG(OI.ProductName, ', ') AS ProductNames,
              STRING_AGG(PT2.ProductType, ', ') AS ProductTypes,
              STRING_AGG(CAST(OI.Weight AS VARCHAR(10)), ', ') AS Weights,
              STRING_AGG(CAST(OI.Quantity AS VARCHAR(10)), ', ') AS Quantities,
              STRING_AGG(CAST(OI.Rate AS VARCHAR(10)), ', ') AS Rates,
              STRING_AGG(CAST(OI.Total AS VARCHAR(10)), ', ') AS ItemTotals,
              STRING_AGG(PT2.ProductUPC, ', ') AS ProductUPCs,
              STRING_AGG(CAST(PT2.MRP AS VARCHAR(10)), ', ') AS MRPs,
              SUM(OI.Total) AS GrandItemTotal
          FROM OrderItems OI WITH (NOLOCK) -- ⭐ Added NOLOCK
          LEFT JOIN (
              SELECT DISTINCT ProductType, ProductUPC, MRP
              FROM ProductTypes WITH (NOLOCK) -- ⭐ Added NOLOCK
          ) PT2 ON OI.ProductType = PT2.ProductType
          WHERE OI.OrderID = O.OrderID
      ) Items

      OUTER APPLY (
    SELECT
        MAX(OP.PaymentID) AS PaymentID,
        'Cash: ' + CAST(ISNULL(SUM(CASE WHEN PM.ModeName = 'Cash' THEN OP.Amount END),0) AS VARCHAR(20)) +
        ' | GPay: ' + CAST(ISNULL(SUM(CASE WHEN PM.ModeName = 'GPay' THEN OP.Amount END),0) AS VARCHAR(20)) +
        ' | Paytm: ' + CAST(ISNULL(SUM(CASE WHEN PM.ModeName = 'Paytm' THEN OP.Amount END),0) AS VARCHAR(20)) +
        ' | FOC: ' + CAST(ISNULL(SUM(CASE WHEN PM.ModeName = 'FOC' THEN OP.Amount END),0) AS VARCHAR(20)) +
        ' | Bank Transfer: ' + CAST(ISNULL(SUM(CASE WHEN PM.ModeName = 'Bank Transfer' THEN OP.Amount END),0) AS VARCHAR(20)) 
        AS PaymentSummary,
        ISNULL(SUM(OP.Amount),0) AS TotalPaid,
        ISNULL(SUM(OP.ShortAmount),0) AS ShortAmount,
        MAX(OP.PaymentVerifyStatus) AS PaymentVerifyStatus,
        MAX(OP.VerificationRemarks) AS VerifyMark
    FROM OrderPayments OP WITH (NOLOCK)
    LEFT JOIN PaymentModes PM WITH (NOLOCK) 
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
    const check = await transaction.request().input("id", sql.Int, id).query(`
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
    const updateRes = await transaction
      .request()
      .input("id", sql.Int, id)
      .input("reason", sql.NVarChar, reason || "Cancelled").query(`
        UPDATE AssignedOrders
        SET DeliveryStatus = 'Cancel',
            CompletionRemarks = @reason
        WHERE AssignID = @id
      `);

    console.log("✅ Order update rows:", updateRes.rowsAffected);

    // 3️⃣ Get Order Items
    const itemsResult = await transaction
      .request()
      .input("orderId", sql.Int, orderId).query(`
        SELECT ProductType, Quantity
        FROM OrderItems
        WHERE OrderID = @orderId
      `);

    // 4️⃣ Revert Stock (FIFO – update only, no insert)
    for (let item of itemsResult.recordset) {
      const stockResult = await transaction
        .request()
        .input("itemName", sql.NVarChar, item.ProductType).query(`
          SELECT TOP 1 ID
          FROM Stock
          WHERE item_name = @itemName
          ORDER BY ID ASC
        `);

      if (stockResult.recordset.length === 0) {
        throw new Error(`Stock not found for ${item.ProductType}`);
      }

      const stockId = stockResult.recordset[0].ID;

      await transaction
        .request()
        .input("qty", sql.Int, item.Quantity)
        .input("id", sql.Int, stockId).query(`
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

exports.updateOrderQuantity = async (req, res) => {
  const { orderId, itemId, newQuantity, changedBy, reason } = req.body;
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const request = new sql.Request(transaction);

    // ---------------------------------------------------------
    // 1️⃣ CHECK STATUS: Order Complete hone par block karein
    // ---------------------------------------------------------
    const statusCheck = await request
      .input("OID", sql.Int, orderId)
      .query(`SELECT DeliveryStatus FROM AssignedOrders WHERE OrderID = @OID`);

    if (
      statusCheck.recordset.length > 0 &&
      statusCheck.recordset[0].DeliveryStatus === "Completed"
    ) {
      return res
        .status(400)
        .json({ message: "Completed order cannot be changed!" });
    }

    // ---------------------------------------------------------
    // 2️⃣ GET CURRENT ITEM DATA: Purani values nikalna
    // ---------------------------------------------------------
    const currentItemResult = await request
      .input("ItemID", sql.Int, itemId)
      .query(
        `SELECT Quantity, ProductType, Rate, Weight FROM OrderItems WHERE ItemID = @ItemID`,
      );

    if (currentItemResult.recordset.length === 0)
      throw new Error("Item not found in OrderItems");

    const currentItem = currentItemResult.recordset[0];
    const oldQty = currentItem.Quantity;
    const diffQty = oldQty - newQuantity;

    // ---------------------------------------------------------
    // 3️⃣ STOCK AVAILABILITY CHECK: Agar badha rahe hain toh mal hai?
    // ---------------------------------------------------------
    if (diffQty < 0) {
      const absDiff = Math.abs(diffQty);
      const stockCheck = await request
        .input("PTypeCheck", sql.NVarChar, currentItem.ProductType.trim())
        .input("PWeightCheck", sql.NVarChar, (currentItem.Weight || "").trim())
        .query(`
          SELECT SUM(Quantity) as AvailableStock 
          FROM Stock 
          WHERE LOWER(LTRIM(RTRIM(item_name))) = LOWER(@PTypeCheck) 
          AND LOWER(LTRIM(RTRIM(weight))) = LOWER(@PWeightCheck)
        `);

      if (
        !stockCheck.recordset[0].AvailableStock ||
        stockCheck.recordset[0].AvailableStock < absDiff
      ) {
        throw new Error(
          `Insufficient stock! Available: ${stockCheck.recordset[0].AvailableStock || 0}`,
        );
      }
    }

    // ---------------------------------------------------------
    // 4️⃣ UPDATE STOCK: Exact Row Match karke update karna
    // ---------------------------------------------------------
    // Hum subquery use kar rahe hain taaki exact vahi record update ho jo latest hai
    const stockUpdateResult = await request
      .input("DiffQty", sql.Int, diffQty)
      .input("PType", sql.NVarChar, currentItem.ProductType.trim())
      .input("PWeight", sql.NVarChar, (currentItem.Weight || "").trim()).query(`
        UPDATE Stock 
        SET Quantity = Quantity + @DiffQty 
        WHERE ID = (
            SELECT TOP 1 ID 
            FROM Stock 
            WHERE LOWER(LTRIM(RTRIM(item_name))) = LOWER(@PType) 
            AND LOWER(LTRIM(RTRIM(weight))) = LOWER(@PWeight)
            ORDER BY created_at DESC
        );
        SELECT @@ROWCOUNT AS RowsAffected;
      `);

    if (stockUpdateResult.recordset[0].RowsAffected === 0) {
      throw new Error(
        "Stock record not found for this product type and weight. Update failed.",
      );
    }

    // ---------------------------------------------------------
    // 5️⃣ UPDATE ORDERITEMS: Quantity aur Total badalna
    // ---------------------------------------------------------
    const newTotal = newQuantity * currentItem.Rate;
    await request
      .input("NewQty", sql.Int, newQuantity)
      .input("NewTotal", sql.Decimal(10, 2), newTotal)
      .input("ITM_ID", sql.Int, itemId).query(`
        UPDATE OrderItems 
        SET Quantity = @NewQty, Total = @NewTotal 
        WHERE ItemID = @ITM_ID
      `);

    // ---------------------------------------------------------
    // 6️⃣ LOG AUDIT TRAIL: History save karna
    // ---------------------------------------------------------
    await request
      .input("OrderIDLog", sql.Int, orderId)
      .input("ItemIDLog", sql.Int, itemId)
      .input("OldQtyLog", sql.Int, oldQty)
      .input("NewQtyLog", sql.Int, newQuantity)
      .input("ChangedByLog", sql.NVarChar, changedBy)
      .input("ReasonLog", sql.NVarChar, reason).query(`
        INSERT INTO OrderEditLogs (OrderID, ItemID, OldQuantity, NewQuantity, ChangedBy, ChangeReason, ChangedAt)
        VALUES (@OrderIDLog, @ItemIDLog, @OldQtyLog, @NewQtyLog, @ChangedByLog, @ReasonLog, GETDATE())
      `);

    await transaction.commit();
    res.status(200).json({
      message: "Order and Stock updated successfully!",
      updatedQuantity: newQuantity,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Update Order Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};
