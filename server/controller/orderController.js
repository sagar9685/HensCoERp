const { sql, poolPromise } = require("../utils/db");

exports.addOrder = async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    const { Items, OrderDate } = req.body;

    await transaction.begin();
    const request = new sql.Request(transaction);

    // ===============================
    // 1️⃣ Invoice Number Generate
    // ===============================

    const orderDt = new Date(OrderDate);
    const year = orderDt.getFullYear();
    const month = orderDt.getMonth() + 1;

    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = fyStart + 1;
    const fyString = `${fyStart % 100}-${fyEnd % 100}`;

    const lastInvoiceResult = await request.query(`
      SELECT TOP 1 InvoiceNo 
      FROM OrdersTemp 
      WHERE InvoiceNo LIKE '${fyString}/%'
      ORDER BY 
      CAST(SUBSTRING(InvoiceNo, CHARINDEX('/', InvoiceNo) + 1, 10) AS INT) DESC
    `);

    let nextSeq = 1;

    if (lastInvoiceResult.recordset.length > 0) {
      const parts = lastInvoiceResult.recordset[0].InvoiceNo.split("/");
      nextSeq = (parseInt(parts[1]) || 0) + 1;
    }

    const invoiceNo = `${fyString}/${nextSeq}`;

    // ===============================
    // 2️⃣ Insert Order Header
    // ===============================

    const orderInsert = await request
      .input("CustomerName", sql.NVarChar, req.body.CustomerName)
      .input("Address", sql.NVarChar, req.body.Address)
      .input("Area", sql.NVarChar, req.body.Area)
      .input("ContactNo", sql.NVarChar, req.body.ContactNo)
      .input("DeliveryCharge", sql.Decimal(18, 2), req.body.DeliveryCharge || 0)
      .input("OrderDate", sql.Date, req.body.OrderDate)
      .input("OrderTakenBy", sql.NVarChar, req.body.OrderTakenBy)
      .input("InvoiceNo", sql.NVarChar, invoiceNo)
      .input("Po_No", sql.NVarChar, req.body.Po_No || null)
      .input("Po_Date", sql.Date, req.body.Po_Date || null)
      .input("InvoiceDate", sql.Date, req.body.InvoiceDate).query(`
        INSERT INTO OrdersTemp
        (CustomerName, Address, Area, ContactNo, DeliveryCharge, OrderDate, OrderTakenBy, InvoiceNo, Po_No, Po_Date, InvoiceDate)
        OUTPUT INSERTED.OrderID
        VALUES
        (@CustomerName, @Address, @Area, @ContactNo, @DeliveryCharge, @OrderDate, @OrderTakenBy, @InvoiceNo, @Po_No, @Po_Date, @InvoiceDate)
      `);

    const orderId = orderInsert.recordset[0].OrderID;

    // ===============================
    // 3️⃣ Insert Items ONLY (NO STOCK DEDUCT)
    // ===============================

    for (let item of Items) {
      const total = Number(item.Quantity) * Number(item.Rate);

      await transaction
        .request()
        .input("OrderID", sql.Int, orderId)
        .input("ProductName", sql.NVarChar, item.ProductName || null)
        .input("ProductType", sql.NVarChar, item.ProductType)
        .input("Weight", sql.NVarChar, item.Weight || null)
     .input("Quantity", sql.Decimal(18,2), item.Quantity) // ✅ FIX
        .input("Rate", sql.Decimal(18, 2), item.Rate)
        .input("Total", sql.Decimal(18, 2), total).query(`
          INSERT INTO OrderItems
          (OrderID, ProductName, ProductType, Weight, Quantity, Rate, Total)
          VALUES
          (@OrderID, @ProductName, @ProductType, @Weight, @Quantity, @Rate, @Total)
        `);
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: "Order Added Successfully!",
      invoiceNo,
    });
  } catch (err) {
    if (transaction._aborted !== true) {
      await transaction.rollback();
    }

    res.status(500).json({
      success: false,
      message: err.message,
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
        Payments.PaymentVerifyStatus, Payments.ShortAmount,
        Payments.VerifyMark -- ⭐ Frontend fix: Added this alias
      FROM OrdersTemp O WITH (NOLOCK)
      OUTER APPLY (
          SELECT TOP 1 *
          FROM Customers C WITH (NOLOCK)
          WHERE O.CustomerName = C.CustomerName
            AND O.ContactNo = C.Contact_No
          ORDER BY C.CustomerID DESC
      ) C
      LEFT JOIN AssignedOrders A WITH (NOLOCK) ON O.OrderID = A.OrderID
      LEFT JOIN DeliveryMen DM WITH (NOLOCK) ON A.DeliveryManID = DM.DeliveryManID

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
          FROM OrderItems OI WITH (NOLOCK)
          LEFT JOIN (
              SELECT DISTINCT ProductType, ProductUPC, MRP
              FROM ProductTypes WITH (NOLOCK)
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
              MAX(OP.VerificationRemarks) AS VerifyMark -- ⭐ Mapping your DB column to Frontend key
          FROM OrderPayments OP WITH (NOLOCK)
          LEFT JOIN PaymentModes PM WITH (NOLOCK) ON OP.PaymentModeID = PM.PaymentModeID
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
  const { reason, username } = req.body;
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
      .input("reason", sql.NVarChar, reason || "Cancelled")
      .input("username", sql.NVarChar, username).query(`
        UPDATE AssignedOrders
        SET DeliveryStatus = 'Cancel',
            CompletionRemarks = @reason,
            CancelledBy = @username
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

      await transaction
        .request()
        .input("itemName", sql.NVarChar, item.ProductType)
        .input("qty", sql.Int, item.Quantity)
        .input("orderId", sql.Int, orderId).query(`
      INSERT INTO StockHistory (item_name, weight, quantity, type, ref_no, date)
      VALUES (@itemName, NULL, @qty, 'CANCEL', @orderId, GETDATE())
    `);

      await transaction
        .request()
        .input("UserRole", sql.NVarChar, "admin")
        .input("Message", sql.NVarChar, `Order ${orderId} cancelled`)
        .input("OrderID", sql.Int, orderId).query(`
INSERT INTO Notifications (UserRole, Message, OrderID)
VALUES (@UserRole, @Message, @OrderID)
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

exports.cancelOrderBeforeAssign = async (req, res) => {
  const orderId = Number(req.params.orderId);
  const { reason, username } = req.body;

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    console.log("➡️ Cancel before assign OrderID:", orderId);

    if (!orderId) {
      throw new Error("Invalid OrderID");
    }

    // 1️⃣ Check order exists
    const check = await new sql.Request(transaction).input(
      "orderId",
      sql.Int,
      orderId,
    ).query(`
        SELECT OrderID
        FROM OrdersTemp
        WHERE OrderID=@orderId
      `);

    if (check.recordset.length === 0) {
      throw new Error("Order not found");
    }

    // 2️⃣ Insert Cancel record in AssignedOrders
    await new sql.Request(transaction)
      .input("orderId", sql.Int, orderId)
      .input("reason", sql.NVarChar, reason || "Cancelled")
      .input("username", sql.NVarChar, username).query(`
    INSERT INTO AssignedOrders
    (
      OrderID,
      DeliveryDate,
      DeliveryStatus,
      Remark,
      AssignedAt,
      CancelledBy
    )
    VALUES
    (
      @orderId,
      GETDATE(),
      'Cancel',
      @reason,
      GETDATE(),
      @username
    )
  `);

    // 3️⃣ Get order items
    const items = await new sql.Request(transaction).input(
      "orderId",
      sql.Int,
      orderId,
    ).query(`
        SELECT ProductType, Quantity
        FROM OrderItems
        WHERE OrderID=@orderId
      `);

    // 4️⃣ Revert stock
    for (const item of items.recordset) {
      const stock = await new sql.Request(transaction).input(
        "itemName",
        sql.NVarChar,
        item.ProductType,
      ).query(`
          SELECT TOP 1 id
          FROM Stock
          WHERE LOWER(item_name)=LOWER(@itemName)
          ORDER BY created_at DESC
        `);

      if (stock.recordset.length === 0) {
        throw new Error(`Stock not found for ${item.ProductType}`);
      }

      const stockId = stock.recordset[0].id;

      await new sql.Request(transaction)
        .input("qty", sql.Int, item.Quantity)
        .input("id", sql.Int, stockId).query(`
          UPDATE Stock
          SET quantity = quantity + @qty
          WHERE id=@id
        `);
    }

    const notifMsg = `Order #${orderId} has been cancelled by ${username || "Admin"}`;

    const notifResult = await new sql.Request(transaction)
      .input("UserRoleNotif", sql.NVarChar, "Operator")
      .input("MsgNotif", sql.NVarChar, notifMsg)
      .input("OIDNotif", sql.Int, orderId).query(`
    INSERT INTO Notifications (UserRole, Message, OrderID)
    OUTPUT INSERTED.*
    VALUES (@UserRoleNotif, @MsgNotif, @OIDNotif)
  `);
    // Transaction commit hone ke baad hi emit karein
    await transaction.commit();

    const io = req.app.get("io");
    if (io) {
      io.emit("newNotification", notifResult.recordset[0]);
      console.log("Socket Emitted:", notifResult.recordset[0]); // Debugging ke liye
    }

    res.json({
      message: "Order cancelled successfully",
    });
  } catch (err) {
    await transaction.rollback();

    console.error("❌ Cancel Error:", err.message);

    res.status(500).json({
      message: err.message,
    });
  }
};

exports.updateOrder = async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    const { OrderID, ProductName, ProductType, Weight, Quantity, Rate } =
      req.body;

    await transaction.begin();

    const request = new sql.Request(transaction);

    const total = Number(Quantity) * Number(Rate);

    // =========================
    // 1️⃣ STOCK CHECK (FIFO)
    // =========================

    let qtyToDeduct = parseInt(Quantity);

    const stockRes = await request.input("Target", sql.NVarChar, ProductType)
      .query(`
        SELECT id, quantity
        FROM Stock
        WHERE LTRIM(RTRIM(item_name)) = @Target
        AND quantity > 0
        ORDER BY id ASC
      `);

    for (let row of stockRes.recordset) {
      if (qtyToDeduct <= 0) break;

      const deduct = Math.min(row.quantity, qtyToDeduct);

      await transaction
        .request()
        .input("D", sql.Int, deduct)
        .input("ID", sql.Int, row.id).query(`
          UPDATE Stock
          SET quantity = quantity - @D
          WHERE id = @ID
        `);

      qtyToDeduct -= deduct;
    }

    if (qtyToDeduct > 0) {
      throw new Error(`Not enough stock for ${ProductType}`);
    }

    // =========================
    // 2️⃣ INSERT ITEM
    // =========================

    await request
      .input("OrderID", sql.Int, OrderID)
      .input("ProductName", sql.NVarChar, ProductName || null)
      .input("ProductType", sql.NVarChar, ProductType)
      .input("Weight", sql.NVarChar, Weight)
      .input("Quantity", sql.Int, Quantity)
      .input("Rate", sql.Decimal(18, 2), Rate)
      .input("Total", sql.Decimal(18, 2), total).query(`
        INSERT INTO OrderItems
        (OrderID, ProductName, ProductType, Weight, Quantity, Rate, Total)
        VALUES
        (@OrderID, @ProductName, @ProductType, @Weight, @Quantity, @Rate, @Total)
      `);

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: "Item added to order successfully",
    });
  } catch (err) {
    if (transaction._aborted !== true) {
      await transaction.rollback();
    }

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.updateOrderQuantity = async (req, res) => {
  const { orderId, itemId, newQuantity, newRate, changedBy, reason } = req.body;
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const request = new sql.Request(transaction);

    console.log("REQ:", req.body);

    // 1. Old item
    const itemRes = await request
      .input("ItemID", sql.Int, itemId)
      .query(`
        SELECT Quantity, ProductType, Rate 
        FROM OrderItems 
        WHERE ItemID = @ItemID
      `);

    if (itemRes.recordset.length === 0)
      throw new Error("Item not found");

    const oldQty = parseFloat(itemRes.recordset[0].Quantity || 0);
    const updatedQty = parseFloat(newQuantity || 0);
    const pType = itemRes.recordset[0].ProductType;
    const oldRate = parseFloat(itemRes.recordset[0].Rate || 0);

    console.log("OLD:", oldQty);
    console.log("NEW:", updatedQty);
    console.log("PRODUCT:", pType);

    if (oldQty === updatedQty) {
      await transaction.rollback();
      return res.json({ success: true, message: "No change" });
    }

    // 2. STOCK CHECK (FINAL QTY should not exceed available)
    const stockRes = await new sql.Request(transaction)
      .input("P", sql.NVarChar, pType)
      .query(`
        DECLARE @FixedOpeningDate DATE = '2026-04-01';

        SELECT 
        (
          ISNULL((SELECT opening_quantity FROM OpeningStock WHERE item_name = @P), 0) + 
          ISNULL((SELECT SUM(quantity) FROM StockHistory 
                  WHERE item_name = @P 
                  AND type IN ('IN','RTV') 
                  AND CAST(date AS DATE) >= @FixedOpeningDate),0)
          -
          ISNULL((SELECT SUM(quantity) FROM StockHistory 
                  WHERE item_name = @P 
                  AND type='REJECT'
                  AND CAST(date AS DATE) >= @FixedOpeningDate),0)
          -
          ISNULL((SELECT SUM(OI.Quantity)
                  FROM OrderItems OI
                  JOIN OrdersTemp OT ON OT.OrderID = OI.OrderID
                  INNER JOIN AssignedOrders AO ON AO.OrderID = OT.OrderID
                  WHERE OI.ProductType=@P
                  AND ISNULL(AO.deliveryStatus,'')<>'CANCEL'
                  AND CAST(OT.OrderDate AS DATE)>=@FixedOpeningDate),0)
        ) AS Available
    `);

    const available = parseFloat(stockRes.recordset[0].Available || 0);

    console.log("AVAILABLE:", available);

    // ⭐ FINAL CHECK
    if (updatedQty > available) {
      throw new Error(
        `Limit Exceeded! Only ${available} trays allowed`
      );
    }

    // 3. Update OrderItems
    const finalRate = newRate || oldRate;

    await new sql.Request(transaction)
      .input("Q", sql.Decimal(18, 2), updatedQty)
      .input("T", sql.Decimal(18, 2), updatedQty * finalRate)
      .input("ID", sql.Int, itemId)
      .query(`
        UPDATE OrderItems 
        SET Quantity=@Q, Total=@T 
        WHERE ItemID=@ID
      `);

    console.log("ORDER UPDATED");

    // 4. LOG ENTRY ONLY
    await new sql.Request(transaction)
      .input("orderId", sql.Int, orderId)
      .input("itemId", sql.Int, itemId)
      .input("oldQty", sql.Decimal(18,2), oldQty)
      .input("newQty", sql.Decimal(18,2), updatedQty)
      .input("changedBy", sql.NVarChar, changedBy || "ADMIN")
      .input("reason", sql.NVarChar, reason || "")
      .input("oldRate", sql.Decimal(18,2), oldRate)
      .input("newRate", sql.Decimal(18,2), finalRate)
      .query(`
        INSERT INTO OrderEditLogs
        (OrderID, ItemID, OldQuantity, NewQuantity, ChangedBy, ChangeReason, ChangedAt, OldRate, NewRate)
        VALUES
        (@orderId,@itemId,@oldQty,@newQty,@changedBy,@reason,GETDATE(),@oldRate,@newRate)
      `);

    console.log("LOG INSERTED");

    await transaction.commit();

    res.json({
      success: true,
      message: "Quantity updated successfully"
    });

  } catch (err) {
    console.log("ERROR:", err);
    if (transaction) await transaction.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.addRTV = async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  try {
    const { OrderID, ItemID, ProductType, Weight, Quantity, Rate, RTVDate, reason, username } = req.body;
    await transaction.begin();
    const total = Quantity * Rate;

    // 1️⃣ Insert RTV Entry
    await new sql.Request(transaction)
      .input("OrderID", sql.Int, OrderID)
      .input("ItemID", sql.Int, ItemID)
      .input("ProductType", sql.NVarChar, ProductType)
      .input("Weight", sql.NVarChar, Weight || null)
      .input("Quantity", sql.Decimal(18, 2), Quantity)
      .input("Rate", sql.Decimal(18, 2), Rate)
      .input("Total", sql.Decimal(18, 2), total)
      .input("RTVDate", sql.Date, RTVDate)
      .input("reason", sql.NVarChar, reason || null)
      .input("username", sql.NVarChar, username || "admin")
      .query(`
        INSERT INTO RTVEntries (OrderID, ItemID, ProductType, Weight, Quantity, Rate, Total, RTVDate, Reason, CreatedBy)
        VALUES (@OrderID, @ItemID, @ProductType, @Weight, @Quantity, @Rate, @Total, @RTVDate, @reason, @username)
      `);

    // 2️⃣ Add Physical Stock (Isse physical table me 0 se upar quantity aayegi)
    await new sql.Request(transaction)
      .input("inward", sql.NVarChar, `RTV-${OrderID}`)
      .input("item", sql.NVarChar, ProductType)
      .input("qty", sql.Decimal(18, 2), Quantity)
      .input("weight", sql.NVarChar, Weight || null)
      .input("date", sql.DateTime, new Date(RTVDate)) // Ensure DateTime for created_at
      .query(`
        INSERT INTO Stock (inward_no, item_name, quantity, weight, created_at, status)
        VALUES (@inward, @item, @qty, @weight, @date, 'RTV')
      `);

    // 3️⃣ Stock History (Reporting ke liye)
    await new sql.Request(transaction)
      .input("itemH", sql.NVarChar, ProductType)
      .input("qtyH", sql.Decimal(18, 2), Quantity)
      .input("weightH", sql.NVarChar, Weight || null)
      .input("ref", sql.Int, OrderID)
      .input("dateH", sql.Date, RTVDate)
      .query(`
        INSERT INTO StockHistory (item_name, weight, quantity, type, ref_no, date)
        VALUES (@itemH, @weightH, @qtyH, 'RTV', @ref, @dateH)
      `);

    await transaction.commit();
    res.json({ success: true, message: "RTV added & stock updated" });
  } catch (err) {
    if (transaction) await transaction.rollback();
    res.status(500).json({ message: err.message });
  }
};
