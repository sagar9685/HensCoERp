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
      OrderTakenBy,
      Items
    } = req.body;

    if (!Items || !Array.isArray(Items) || Items.length === 0) {
      return res.status(400).json({ message: "Order must contain at least one item." });
    }

    const pool = await poolPromise;

    // -------------------------------------------------------
    // 1️⃣ DETECT CURRENT FINANCIAL YEAR
    // -------------------------------------------------------
    const orderDt = new Date(OrderDate);
    const year = orderDt.getFullYear();
    const month = orderDt.getMonth() + 1;

    let fyStart, fyEnd;

    if (month >= 4) {
      // April to December → current FY
      fyStart = year;
      fyEnd = year + 1;
    } else {
      // January to March → previous FY
      fyStart = year - 1;
      fyEnd = year;
    }

    const fyString = `${fyStart % 100}-${fyEnd % 100}`;  // Example: 25-26

    // -------------------------------------------------------
    // 2️⃣ GET LAST INVOICE OF THIS FY
    // -------------------------------------------------------
    const lastInvoiceQuery = `
      SELECT TOP 1 InvoiceNo 
      FROM OrdersTemp
      WHERE InvoiceNo LIKE '${fyString}/%'
      ORDER BY OrderID DESC;
    `;

    const lastInvoiceResult = await pool.request().query(lastInvoiceQuery);

    let nextSequence = 1;

    if (lastInvoiceResult.recordset.length > 0) {
      const lastInvoice = lastInvoiceResult.recordset[0].InvoiceNo;  // Example: 25-26/07
      const lastSeq = parseInt(lastInvoice.split("/")[1]);
      nextSequence = lastSeq + 1;
    }

    const invoiceNo = `${fyString}/${String(nextSequence).padStart(2, "0")}`;

    // -------------------------------------------------------
    // 3️⃣ INSERT INTO ORDERTEMP WITH INVOICE NO
    // -------------------------------------------------------
    const orderQuery = `
      INSERT INTO OrdersTemp 
      (CustomerName, Address, Area, ContactNo, DeliveryCharge, OrderDate, OrderTakenBy, InvoiceNo)
      OUTPUT INSERTED.OrderID
      VALUES 
      (@CustomerName, @Address, @Area, @ContactNo, @DeliveryCharge, @OrderDate, @OrderTakenBy, @InvoiceNo);
    `;

    const orderRequest = pool.request();
    orderRequest.input("CustomerName", sql.NVarChar, CustomerName);
    orderRequest.input("Address", sql.NVarChar, Address);
    orderRequest.input("Area", sql.NVarChar, Area);
    orderRequest.input("ContactNo", sql.VarChar, ContactNo);
    orderRequest.input("DeliveryCharge", sql.Decimal(10, 2), DeliveryCharge);
    orderRequest.input("OrderDate", sql.Date, OrderDate);
    orderRequest.input("OrderTakenBy", sql.NVarChar, OrderTakenBy);
    orderRequest.input("InvoiceNo", sql.NVarChar, invoiceNo);

    const result = await orderRequest.query(orderQuery);
    const orderId = result.recordset[0].OrderID;

    // -------------------------------------------------------
    // 4️⃣ INSERT ORDER ITEMS
    // -------------------------------------------------------
    for (let item of Items) {
      const itemQuery = `
        INSERT INTO OrderItems 
        (OrderID, ProductName, ProductType, Weight, Quantity, Rate, Total)
        VALUES 
        (@OrderID, @ProductName, @ProductType, @Weight, @Quantity, @Rate, @Total)
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
      message: "Order + Invoice Generated!",
      orderId,
      invoiceNo
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
