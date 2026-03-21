const { sql, poolPromise } = require("../utils/db");
const moment = require("moment");

/* =======================
   MONTHLY REPORT
======================= */

exports.getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ message: "Year and Month are required" });
    }

    const pool = await poolPromise;
    const request = pool
      .request()
      .input("year", sql.Int, year)
      .input("month", sql.Int, month);

    // 1. Unified Summary & Delivery Charges
    // We calculate item totals and delivery charges separately to avoid duplication
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT o.OrderID) AS TotalOrders,
        ISNULL(SUM(CASE WHEN ao.DeliveryStatus != 'cancel' THEN oi.ItemTotal ELSE 0 END), 0) AS TotalItemSales,
        ISNULL(SUM(CASE WHEN ao.DeliveryStatus = 'cancel' THEN oi.ItemTotal ELSE 0 END), 0) AS CancelOrderAmount,
        (SELECT ISNULL(SUM(TRY_CAST(DeliveryCharge AS DECIMAL(18,2))), 0) 
         FROM OrdersTemp ot
         JOIN AssignedOrders ao2 ON ot.OrderID = ao2.OrderID
         WHERE YEAR(ot.OrderDate) = @year AND MONTH(ot.OrderDate) = @month 
         AND ao2.DeliveryStatus != 'cancel') AS TotalDeliveryCharge
      FROM OrdersTemp o
      LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderID
      CROSS APPLY (
        SELECT SUM(TRY_CAST(Total AS DECIMAL(18,2))) AS ItemTotal 
        FROM OrderItems 
        WHERE OrderID = o.OrderID
      ) oi
      WHERE YEAR(o.OrderDate) = @year AND MONTH(o.OrderDate) = @month
    `;

    const summaryRes = await request.query(summaryQuery);
    const rawSummary = summaryRes.recordset[0] || {};

    const totalSales =
      Number(rawSummary.TotalItemSales) +
      Number(rawSummary.TotalDeliveryCharge);

    // 2. Payments (Stays similar, but ensure unique calculation)
    const paymentsRes = await request.query(`
  SELECT pm.ModeName, ISNULL(SUM(TRY_CAST(op.Amount AS DECIMAL(18,2))), 0) AS Amount
  FROM OrderPayments op
  JOIN PaymentModes pm ON pm.PaymentModeID = op.PaymentModeID
  JOIN OrdersTemp o ON o.OrderID = op.OrderID
  JOIN AssignedOrders ao ON ao.OrderID = o.OrderID   -- ✅ ADD
  WHERE YEAR(o.OrderDate) = @year 
  AND MONTH(o.OrderDate) = @month
  AND ao.DeliveryStatus != 'cancel'                  -- ✅ ADD
  GROUP BY pm.ModeName
`);

    const paymentBreakup = paymentsRes.recordset || [];

    // 3. Product Type Summary
    const productTypeRes = await request.query(`
      SELECT 
        oi.ProductType,
        SUM(TRY_CAST(oi.Quantity AS DECIMAL(18,2))) AS TotalQty,
        SUM(TRY_CAST(oi.Total AS DECIMAL(18,2))) AS TotalAmount,
        AVG(TRY_CAST(oi.Rate AS DECIMAL(18,2))) AS AvgRate
      FROM OrderItems oi
      JOIN OrdersTemp o ON o.OrderID = oi.OrderID
      JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
      WHERE YEAR(o.OrderDate) = @year AND MONTH(o.OrderDate) = @month AND ao.DeliveryStatus != 'cancel'
      GROUP BY oi.ProductType
    `);

    // 4. Chicken vs Egg (Categorized Logic)
    // You can actually combine these into one query with CASE WHEN to reduce DB hits
    const categoryRes = await request.query(`
      SELECT 
        SUM(CASE WHEN ProductType NOT IN ('Tray','Box','Box (Kids)','Box (Women)') THEN 
            (CASE WHEN Weight LIKE '%Gram%' THEN TRY_CAST(REPLACE(Weight,' Gram','') AS DECIMAL(18,2)) / 1000
                  WHEN Weight LIKE '%Kg%' THEN TRY_CAST(REPLACE(Weight,' Kg','') AS DECIMAL(18,2)) ELSE 0 END) ELSE 0 END) AS ChickenKG,
        SUM(CASE WHEN ProductType NOT IN ('Tray','Box','Box (Kids)','Box (Women)') THEN TRY_CAST(Total AS DECIMAL(18,2)) ELSE 0 END) AS ChickenAmount,
        SUM(CASE 
            WHEN ProductType='Tray' THEN TRY_CAST(Quantity AS INT)*30
            WHEN ProductType='Box' THEN TRY_CAST(Quantity AS INT)*6
            WHEN ProductType IN ('Box (Kids)', 'Box (Women)') THEN TRY_CAST(Quantity AS INT)*10
            ELSE 0 END) AS TotalEggs,
        SUM(CASE WHEN ProductType IN ('Tray','Box','Box (Kids)','Box (Women)') THEN TRY_CAST(Total AS DECIMAL(18,2)) ELSE 0 END) AS EggAmount
      FROM OrderItems oi
      JOIN OrdersTemp o ON o.OrderID = oi.OrderID
      JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
      WHERE YEAR(o.OrderDate) = @year AND MONTH(o.OrderDate) = @month AND ao.DeliveryStatus != 'cancel'
    `);

    // 5 payment collection
    // You can actually combine these into one query with CASE WHEN to reduce DB hits
    const paymentCollectedRes = await request.query(`
  SELECT 
    ISNULL(SUM(
      CASE 
        WHEN op.PaymentVerifyStatus = 'Verified' 
          THEN TRY_CAST(op.Amount AS DECIMAL(18,2))
        WHEN op.PaymentVerifyStatus = 'Short' 
          THEN TRY_CAST(op.Amount AS DECIMAL(18,2)) - ISNULL(op.ShortAmount, 0)
        ELSE 0
      END
    ), 0) AS TotalReceived
  FROM OrderPayments op
  JOIN PaymentModes pm ON pm.PaymentModeID = op.PaymentModeID
  JOIN OrdersTemp o ON o.OrderID = op.OrderID
  JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
  WHERE YEAR(o.OrderDate) = @year 
  AND MONTH(o.OrderDate) = @month
  AND ao.DeliveryStatus != 'cancel'
  AND op.PaymentModeID != 4
  AND pm.IsRevenue = 1
`);

    // 6 outstanding

    const outstandingRes = await request.query(`
  SELECT 
    ISNULL(SUM(
      CASE 
        WHEN op.PaymentVerifyStatus = 'Verified' THEN 0
        WHEN op.PaymentVerifyStatus = 'Short' THEN ISNULL(op.ShortAmount, 0)
        WHEN op.PaymentVerifyStatus = 'Pending' THEN TRY_CAST(op.Amount AS DECIMAL(18,2))
        ELSE 0
      END
    ), 0) AS TotalOutstanding
  FROM OrderPayments op
  JOIN PaymentModes pm ON pm.PaymentModeID = op.PaymentModeID
  JOIN OrdersTemp o ON o.OrderID = op.OrderID
  JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
  WHERE YEAR(o.OrderDate) = @year 
  AND MONTH(o.OrderDate) = @month
  AND ao.DeliveryStatus != 'cancel'
  AND op.PaymentModeID != 4
  AND pm.IsRevenue = 1
`);

    const cats = categoryRes.recordset[0] || {};

    const totalReceived = paymentCollectedRes.recordset[0]?.TotalReceived || 0;

    const totalOutstanding = outstandingRes.recordset[0]?.TotalOutstanding || 0;

    res.status(200).json({
      summary: {
        TotalOrders: rawSummary.TotalOrders,
        TotalSales: totalSales,
        CancelOrderAmount: Number(rawSummary.CancelOrderAmount),
        TotalReceived: totalReceived,
        TotalOutstanding: totalOutstanding,
      },
      payment: paymentBreakup,
      productTypeSummary: productTypeRes.recordset,
      chickenSummary: {
        TotalKG: cats.ChickenKG,
        TotalAmount: cats.ChickenAmount,
      },
      eggSummary: { TotalEggs: cats.TotalEggs, TotalAmount: cats.EggAmount },
      deliveryChargeSummary: {
        TotalDeliveryCharge: rawSummary.TotalDeliveryCharge,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   WEEKLY REPORT
======================= */
/* =======================
   WEEKLY REPORT
======================= */
exports.getWeeklyReport = async (req, res) => {
  try {
    const { year, month, week } = req.query;

    // Safety: string se number banao
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const weekNum = parseInt(week, 10);

    if (isNaN(yearNum) || isNaN(monthNum) || isNaN(weekNum)) {
      return res.status(400).json({ message: "Invalid year, month or week" });
    }

    const startDay = (weekNum - 1) * 7 + 1;
    const endDay = weekNum * 7;

    const pool = await poolPromise;

    // Query execute karo
    const request = pool
      .request()
      .input("year", sql.Int, yearNum)
      .input("month", sql.Int, monthNum)
      .input("startDay", sql.Int, startDay)
      .input("endDay", sql.Int, endDay);

    const result = await request.query(`
     SELECT 
    CAST(o.OrderDate AS DATE) AS OrderDate,
    COUNT(DISTINCT o.OrderID) AS Orders,
    SUM(oi.Total) AS TotalSales,
    p.ProductType,                  
    p.Rate,
    SUM(oi.Quantity) AS QuantitySold,
    SUM(oi.Total) AS ProductTotalAmount
FROM OrdersTemp o
JOIN OrderItems oi ON o.OrderID = oi.OrderID
JOIN OrderItems p ON oi.OrderID = p.OrderID     
WHERE 
    YEAR(o.OrderDate) = @year
    AND MONTH(o.OrderDate) = @month
    AND DAY(o.OrderDate) BETWEEN @startDay AND @endDay
GROUP BY 
    CAST(o.OrderDate AS DATE),
    p.ProductType,
    p.Rate
ORDER BY 
    OrderDate,
    ProductTotalAmount DESC; 
    `);

    // Response bhejo
    res.status(200).json({
      week: weekNum,
      from: startDay,
      to: endDay,
      data: result.recordset || [],
    });
  } catch (err) {
    console.error("Weekly Report Error:", err); // ← server console mein detail dikhega
    res.status(500).json({
      message: err.message || "Internal server error in weekly report",
    });
  }
};

/* =======================
   DAILY REPORT (By Date & Delivery Boy)
======================= */
exports.getDailyReport = async (req, res) => {
  try {
    const { date, deliveryBoyId } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const pool = await poolPromise;
    const request = pool.request();
    request.input("targetDate", sql.Date, date);

    const dbid =
      deliveryBoyId && deliveryBoyId !== "all" && deliveryBoyId !== ""
        ? parseInt(deliveryBoyId)
        : null;

    if (dbid) {
      request.input("dbid", sql.Int, dbid);
    }

    const boyFilter = dbid ? "AND ao.DeliveryManId = @dbid" : "";

    // =====================================================
    // 1️⃣ PRODUCT BREAKDOWN (All Orders - INCLUDING FOC)
    // =====================================================
    const itemsResult = await request.query(`
      SELECT 
        t.ProductType,
        t.Weight,
        SUM(t.Qty) AS Qty,
        t.Rate,
        SUM(t.ItemTotal) + SUM(t.DeliveryCharge) AS Amount
      FROM (
        SELECT 
            o.OrderID,
            oi.ProductType,
            oi.Weight,
            oi.Quantity AS Qty,
            oi.Rate,
            oi.Total AS ItemTotal,
            CASE 
                WHEN ROW_NUMBER() OVER (PARTITION BY o.OrderID ORDER BY o.OrderID) = 1 
                THEN ISNULL(o.DeliveryCharge,0)
                ELSE 0
            END AS DeliveryCharge
        FROM OrdersTemp o
        JOIN OrderItems oi ON o.OrderID = oi.OrderID
        LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
        WHERE CAST(o.OrderDate AS DATE) = @targetDate AND ISNULL(ao.DeliveryStatus,'') != 'Cancel'
        ${boyFilter}
      ) t
      GROUP BY t.ProductType, t.Weight, t.Rate
      ORDER BY t.ProductType, t.Weight
    `);

    // =====================================================
    // 2️⃣ PAYMENT BREAKDOWN (Based on Order Date, not Payment Date)
    // =====================================================
    const paymentsResult = await request.query(`
      SELECT 
          pm.ModeName,
          SUM(op.Amount) AS ModeTotal,
          pm.IsRevenue
      FROM OrdersTemp o
      JOIN OrderPayments op ON o.OrderID = op.OrderID
      JOIN PaymentModes pm ON pm.PaymentModeID = op.PaymentModeID
      LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
      WHERE CAST(o.OrderDate AS DATE) = @targetDate AND ISNULL(ao.DeliveryStatus,'') != 'Cancel'
      ${boyFilter}
      GROUP BY pm.ModeName, pm.IsRevenue
      ORDER BY 
        CASE WHEN pm.ModeName = 'FOC' THEN 1 ELSE 0 END,
        pm.ModeName
    `);

    // =====================================================
    // 3️⃣ REVENUE SALES (Excluding FOC) - Based on Order Date
    // =====================================================
    const grossSalesResult = await request.query(`
      SELECT 
        ISNULL(SUM(t.ItemTotal), 0) + ISNULL(SUM(t.DeliveryCharge), 0) AS GrossSales
      FROM (
        SELECT 
            o.OrderID,
            oi.Total AS ItemTotal,
            CASE 
                WHEN ROW_NUMBER() OVER (PARTITION BY o.OrderID ORDER BY o.OrderID) = 1 
                THEN ISNULL(o.DeliveryCharge,0)
                ELSE 0
            END AS DeliveryCharge
        FROM OrdersTemp o
        JOIN OrderItems oi ON o.OrderID = oi.OrderID
        LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
        WHERE CAST(o.OrderDate AS DATE) = @targetDate AND ISNULL(ao.DeliveryStatus,'') != 'Cancel'
        ${boyFilter}
        AND NOT EXISTS (
            SELECT 1
            FROM OrderPayments op
            JOIN PaymentModes pm ON pm.PaymentModeID = op.PaymentModeID
            WHERE op.OrderID = o.OrderID
            AND (op.PaymentModeID = 4 OR pm.IsRevenue = 0)
        )
      ) t
    `);

    // =====================================================
    // 4️⃣ PAYMENT COLLECTED (Based on Order Date, matching Customer Report logic)
    // =====================================================
    const paymentCollectedResult = await request.query(`
  SELECT 
    ISNULL(SUM(
      CASE 
        WHEN op.PaymentVerifyStatus = 'Verified' 
          THEN op.Amount
        WHEN op.PaymentVerifyStatus = 'Short' 
          THEN (op.Amount - ISNULL(op.ShortAmount, 0))
        ELSE 0
      END
    ), 0) AS PaymentCollected
  FROM OrdersTemp o
  JOIN OrderPayments op ON o.OrderID = op.OrderID
  JOIN PaymentModes pm ON pm.PaymentModeID = op.PaymentModeID
  LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
  WHERE CAST(o.OrderDate AS DATE) = @targetDate 
  AND ISNULL(ao.DeliveryStatus,'') != 'Cancel'
  ${boyFilter} 
  AND op.PaymentModeID != 4
  AND pm.IsRevenue = 1
`);

    // =====================================================
    // 5️⃣ FOC AMOUNT (Separately track FOC for transparency)
    // =====================================================
    const focAmountResult = await request.query(`
      SELECT 
        ISNULL(SUM(op.Amount), 0) AS FOCAmount
      FROM OrdersTemp o
      JOIN OrderPayments op ON o.OrderID = op.OrderID
      JOIN PaymentModes pm ON pm.PaymentModeID = op.PaymentModeID
      LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
      WHERE CAST(o.OrderDate AS DATE) = @targetDate AND ISNULL(ao.DeliveryStatus,'') != 'Cancel'
      ${boyFilter}
      AND (op.PaymentModeID = 4 OR pm.IsRevenue = 0)
    `);

    // =====================================================
    // 🥚 CHICKEN KG & EGG PCS SUMMARY
    // =====================================================
    const categorySummaryResult = await request.query(`
  SELECT 
    SUM(
      CASE 
        WHEN oi.ProductType NOT IN ('Tray','Box','Box (Kids)','Box (Women)') 
        THEN 
          CASE 
           WHEN oi.Weight LIKE '%Gram%' 
  THEN (TRY_CAST(REPLACE(oi.Weight,' Gram','') AS DECIMAL(18,2)) / 1000) * TRY_CAST(oi.Quantity AS DECIMAL(18,2))
WHEN oi.Weight LIKE '%Kg%' 
  THEN TRY_CAST(REPLACE(oi.Weight,' Kg','') AS DECIMAL(18,2)) * TRY_CAST(oi.Quantity AS DECIMAL(18,2))
            ELSE 0
          END
        ELSE 0
      END
    ) AS TotalChickenKG,

    SUM(
      CASE 
        WHEN oi.ProductType = 'Tray' THEN TRY_CAST(oi.Quantity AS INT) * 30
        WHEN oi.ProductType = 'Box' THEN TRY_CAST(oi.Quantity AS INT) * 6
        WHEN oi.ProductType IN ('Box (Kids)','Box (Women)') THEN TRY_CAST(oi.Quantity AS INT) * 10
        ELSE 0
      END
    ) AS TotalEggPCS

  FROM OrderItems oi
  JOIN OrdersTemp o ON o.OrderID = oi.OrderID
  LEFT JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
  WHERE CAST(o.OrderDate AS DATE) = @targetDate
  AND ISNULL(ao.DeliveryStatus,'') != 'Cancel'
  ${boyFilter}
`);

    // =====================================================
    // 6️⃣ TOTAL ORDERS COUNT
    // =====================================================
    const ordersCountResult = await request.query(`
      SELECT COUNT(DISTINCT o.OrderID) AS TotalOrders
      FROM OrdersTemp o
      LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
      WHERE CAST(o.OrderDate AS DATE) = @targetDate AND ISNULL(ao.DeliveryStatus,'') != 'Cancel'
      ${boyFilter} 
    `);

    // =====================================================
    // 7️⃣ REVENUE ORDERS COUNT (Excluding FOC)
    // =====================================================
    const revenueOrdersCountResult = await request.query(`
      SELECT COUNT(DISTINCT o.OrderID) AS RevenueOrders
      FROM OrdersTemp o
      LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
      WHERE CAST(o.OrderDate AS DATE) = @targetDate AND ISNULL(ao.DeliveryStatus,'') != 'Cancel'
      ${boyFilter}
      AND NOT EXISTS (
          SELECT 1
          FROM OrderPayments op
          JOIN PaymentModes pm ON pm.PaymentModeID = op.PaymentModeID
          WHERE op.OrderID = o.OrderID
          AND (op.PaymentModeID = 4 OR pm.IsRevenue = 0)
      )
    `);

    // =====================================================
    // 8 Outstanding (Excluding FOC)
    // =====================================================

    const outstandingResult = await request.query(`
  SELECT 
    ISNULL(SUM(
      CASE 
        WHEN op.PaymentVerifyStatus = 'Verified' THEN 0
        WHEN op.PaymentVerifyStatus = 'Short' THEN ISNULL(op.ShortAmount, 0)
        WHEN op.PaymentVerifyStatus = 'Pending' THEN ISNULL(op.Amount, 0)
        ELSE 0
      END
    ), 0) AS OutstandingAmount
  FROM OrdersTemp o
  JOIN OrderPayments op ON o.OrderID = op.OrderID
  JOIN PaymentModes pm ON pm.PaymentModeID = op.PaymentModeID
  LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderId
  WHERE CAST(o.OrderDate AS DATE) = @targetDate 
  AND ISNULL(ao.DeliveryStatus,'') != 'Cancel'
  ${boyFilter}
  AND op.PaymentModeID != 4
  AND pm.IsRevenue = 1
`);

    // =====================================================
    // FINAL CALCULATIONS
    // =====================================================
    const productData = itemsResult.recordset || [];
    const paymentData = paymentsResult.recordset || [];

    const totalSaleAmount = grossSalesResult.recordset[0]?.GrossSales || 0;
    const totalReceived =
      paymentCollectedResult.recordset[0]?.PaymentCollected || 0;
    const totalFOC = focAmountResult.recordset[0]?.FOCAmount || 0;
    const totalOutstanding =
      outstandingResult.recordset[0]?.OutstandingAmount || 0;
    const totalOrders = ordersCountResult.recordset[0]?.TotalOrders || 0;
    const revenueOrders =
      revenueOrdersCountResult.recordset[0]?.RevenueOrders || 0;

    const categorySummary = categorySummaryResult.recordset[0] || {};

    const totalChickenKG = categorySummary.TotalChickenKG || 0;
    const totalEggPCS = categorySummary.TotalEggPCS || 0;

    // =====================================================
    // RESPONSE
    // =====================================================
    res.status(200).json({
      date,
      reportType: dbid ? `Delivery Boy ID: ${dbid}` : "Full Day Report (All)",
      summary: {
        totalOrders: totalOrders,
        revenueOrders: revenueOrders,
        totalGrossSales: totalSaleAmount,
        paymentCollected: totalReceived,
        totalOutstanding: totalOutstanding >= 0 ? totalOutstanding : 0,
        focAmount: totalFOC,
        totalChickenKG: totalChickenKG,
        totalEggPCS: totalEggPCS,
      },
      products: productData,
      payments: paymentData,
    });
  } catch (err) {
    console.error("Daily Report Error:", err);
    res.status(500).json({
      message: "Internal server error in Daily Report",
    });
  }
};

exports.getCustomerWiseSummaryByDate = async (req, res) => {
  try {
    const { from, to, customer } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "From and To date are required" });
    }

    const pool = await poolPromise;
    const request = pool.request();
    request.input("fromDate", from);
    request.input("toDate", to);

    let customerFilter = "";
    if (customer && customer.length > 0) {
      const names = customer.split(",");
      const params = names.map((_, i) => `@cust${i}`).join(",");

      names.forEach((name, i) => {
        request.input(`cust${i}`, name);
      });

      customerFilter = `AND O.CustomerName IN (${params})`;
    }

    const query = `
SELECT 
    O.OrderID,
    O.OrderDate,
    O.CustomerName,
    O.ContactNo,
    O.Area,
    O.Address,
    ISNULL(DB.Name, A.OtherDeliveryManName) AS DeliveryBoyName,
    
    -- Product Details
    STRING_AGG(
        CAST(CONCAT(OI.ProductType, ' [', OI.Weight, ' x ', OI.Quantity, ' @ ', OI.Rate, ']') AS VARCHAR(MAX)),
        ' | '
    ) AS ItemDetails,
    
    -- Payment Mode Details
    ISNULL((
        SELECT STRING_AGG(CONCAT(PM.ModeName, ': ', OP_Sub.Amount), ', ')
        FROM OrderPayments OP_Sub
        JOIN PaymentModes PM ON OP_Sub.PaymentModeID = PM.PaymentModeID
        WHERE OP_Sub.OrderID = O.OrderID
    ), 'No Payment') AS PaymentModeDetails,

    -- ✅ OrderAmount (FOC Excluded)
    CASE 
    WHEN EXISTS (
        SELECT 1
        FROM OrderPayments OP
        JOIN PaymentModes PM ON OP.PaymentModeID = PM.PaymentModeID
        WHERE OP.OrderID = O.OrderID
        AND (OP.PaymentModeID = 4 OR PM.IsRevenue = 0)
    )
    THEN 0
    ELSE
    (
        ISNULL((SELECT SUM(Total) FROM OrderItems WHERE OrderID = O.OrderID), 0)
        + ISNULL(MAX(O.DeliveryCharge), 0)
    )
    END AS OrderAmount,

    -- ✅ PaidAmount (FOC Excluded)
    ISNULL((
        SELECT SUM(OP.Amount)
        FROM OrderPayments OP
        JOIN PaymentModes PM ON OP.PaymentModeID = PM.PaymentModeID
        WHERE OP.OrderID = O.OrderID
        AND OP.PaymentModeID != 4
        AND PM.IsRevenue = 1
    ), 0) AS PaidAmount,

    ISNULL((SELECT SUM(ShortAmount) FROM OrderPayments WHERE OrderID = O.OrderID), 0) AS ShortAmount,

    -- ✅ OutstandingAmount (Updated Logic)
    (
        CASE 
        WHEN EXISTS (
            SELECT 1
            FROM OrderPayments OP
            JOIN PaymentModes PM ON OP.PaymentModeID = PM.PaymentModeID
            WHERE OP.OrderID = O.OrderID
            AND (OP.PaymentModeID = 4 OR PM.IsRevenue = 0)
        )
        THEN 0
        ELSE
        (
            ISNULL((SELECT SUM(Total) FROM OrderItems WHERE OrderID = O.OrderID), 0)
            + ISNULL(MAX(O.DeliveryCharge), 0)
        )
        END
    )
    -
    ISNULL((
        SELECT SUM(OP.Amount)
        FROM OrderPayments OP
        JOIN PaymentModes PM ON OP.PaymentModeID = PM.PaymentModeID
        WHERE OP.OrderID = O.OrderID
        AND OP.PaymentModeID != 4
        AND PM.IsRevenue = 1
    ), 0)
    AS OutstandingAmount

FROM OrdersTemp O WITH (NOLOCK)
LEFT JOIN OrderItems OI WITH (NOLOCK) ON O.OrderID = OI.OrderID
LEFT JOIN AssignedOrders A WITH (NOLOCK) ON O.OrderID = A.OrderID
LEFT JOIN DeliveryMen DB WITH (NOLOCK) ON A.DeliveryManID = DB.DeliveryManID

WHERE O.OrderDate BETWEEN @fromDate AND @toDate
${customerFilter}

GROUP BY 
    O.OrderID, 
    O.OrderDate, 
    O.CustomerName, 
    O.ContactNo, 
    O.Area, 
    O.Address,
    DB.Name,
    A.OtherDeliveryManName
ORDER BY O.OrderDate DESC
`;

    const result = await request.query(query);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("SQL Error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

exports.getCustomerLedger = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { from, to } = req.query;

    // Optional date filter to see ledger for a specific period
    let dateFilter = "";
    if (from && to) {
      dateFilter = "WHERE O.OrderDate BETWEEN @from AND @to";
    }

    const query = `
      SELECT 
    O.CustomerName,
    O.ContactNo,
    MAX(O.Area) AS Area,

    -- Total Billed (Items + Delivery)
    SUM(ISNULL(OI_Total.OrderSum, 0) + ISNULL(O.DeliveryCharge, 0)) AS TotalDebit,

    -- Total Received (Payment)
    SUM(ISNULL(OP_Total.PaidSum, 0)) AS TotalCredit,

    -- Net Outstanding
    SUM(
        (ISNULL(OI_Total.OrderSum, 0) + ISNULL(O.DeliveryCharge, 0)) 
        - ISNULL(OP_Total.PaidSum, 0)
    ) AS NetBalance

FROM OrdersTemp O WITH (NOLOCK)

OUTER APPLY (
    SELECT SUM(total) AS OrderSum 
    FROM OrderItems 
    WHERE OrderID = O.OrderID
) OI_Total

OUTER APPLY (
    SELECT SUM(Amount) AS PaidSum 
    FROM OrderPayments 
    WHERE OrderID = O.OrderID
) OP_Total

${dateFilter}

GROUP BY O.CustomerName, O.ContactNo

HAVING SUM(
        (ISNULL(OI_Total.OrderSum, 0) + ISNULL(O.DeliveryCharge, 0)) 
        - ISNULL(OP_Total.PaidSum, 0)
    ) <> 0

ORDER BY NetBalance DESC;

    `;

    const request = pool.request();
    if (from && to) {
      request.input("from", from);
      request.input("to", to);
    }

    const result = await request.query(query);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMonthlyCompareReport = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ message: "Year and Month are required" });
    }

    const prevMonth = month == 1 ? 12 : month - 1;
    const prevYear = month == 1 ? year - 1 : year;

    const pool = await poolPromise;

    // ====================================================
    // 1. EGG COMPARISON
    // ====================================================
    const eggRes = await pool
      .request()
      .input("year", sql.Int, year)
      .input("month", sql.Int, month)
      .input("prevYear", sql.Int, prevYear)
      .input("prevMonth", sql.Int, prevMonth).query(`
        SELECT 
          oi.ProductType,

          SUM(CASE WHEN YEAR(o.OrderDate)=@year AND MONTH(o.OrderDate)=@month 
              THEN TRY_CAST(oi.Quantity AS INT) ELSE 0 END) AS CurrentQty,

          SUM(CASE WHEN YEAR(o.OrderDate)=@prevYear AND MONTH(o.OrderDate)=@prevMonth 
              THEN TRY_CAST(oi.Quantity AS INT) ELSE 0 END) AS PreviousQty,

          SUM(CASE WHEN YEAR(o.OrderDate)=@year AND MONTH(o.OrderDate)=@month 
              THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) ELSE 0 END) AS CurrentAmount,

          SUM(CASE WHEN YEAR(o.OrderDate)=@prevYear AND MONTH(o.OrderDate)=@prevMonth 
              THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) ELSE 0 END) AS PreviousAmount

        FROM OrderItems oi
        JOIN OrdersTemp o ON o.OrderID = oi.OrderID
        JOIN AssignedOrders ao ON ao.OrderID = o.OrderID

        WHERE oi.ProductType IN ('Tray','Box','Box (Kids)','Box (Women)')
        AND ao.DeliveryStatus != 'cancel'

        GROUP BY oi.ProductType
      `);

    // ====================================================
    // 2. CHICKEN COMPARISON
    // ====================================================
    const chickenRes = await pool
      .request()
      .input("year", sql.Int, year)
      .input("month", sql.Int, month)
      .input("prevYear", sql.Int, prevYear)
      .input("prevMonth", sql.Int, prevMonth).query(`
SELECT 
  oi.ProductType,

  -- CURRENT QTY
  SUM(CASE 
    WHEN YEAR(o.OrderDate)=@year AND MONTH(o.OrderDate)=@month 
    THEN TRY_CAST(oi.Quantity AS DECIMAL(18,2)) 
    ELSE 0 END) AS CurrentQty,

  -- PREVIOUS QTY
  SUM(CASE 
    WHEN YEAR(o.OrderDate)=@prevYear AND MONTH(o.OrderDate)=@prevMonth 
    THEN TRY_CAST(oi.Quantity AS DECIMAL(18,2)) 
    ELSE 0 END) AS PreviousQty,

  -- CURRENT AMOUNT
  SUM(CASE 
    WHEN YEAR(o.OrderDate)=@year AND MONTH(o.OrderDate)=@month 
    THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) 
    ELSE 0 END) AS CurrentAmount,

  -- PREVIOUS AMOUNT
  SUM(CASE 
    WHEN YEAR(o.OrderDate)=@prevYear AND MONTH(o.OrderDate)=@prevMonth 
    THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) 
    ELSE 0 END) AS PreviousAmount

FROM OrderItems oi
JOIN OrdersTemp o ON o.OrderID = oi.OrderID
JOIN AssignedOrders ao ON ao.OrderID = o.OrderID

WHERE oi.ProductType NOT IN ('Tray','Box','Box (Kids)','Box (Women)')
AND LOWER(ao.DeliveryStatus) NOT IN ('cancel','cancelled')

GROUP BY oi.ProductType
ORDER BY oi.ProductType
      `);

    // ====================================================
    // 3. PRODUCT REVENUE
    // ====================================================
    const revenueRes = await pool
      .request()
      .input("year", sql.Int, year)
      .input("month", sql.Int, month)
      .input("prevYear", sql.Int, prevYear)
      .input("prevMonth", sql.Int, prevMonth).query(`
        SELECT 
          oi.ProductType,

          SUM(CASE WHEN YEAR(o.OrderDate)=@year AND MONTH(o.OrderDate)=@month 
            THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) ELSE 0 END) AS CurrentRevenue,

          SUM(CASE WHEN YEAR(o.OrderDate)=@prevYear AND MONTH(o.OrderDate)=@prevMonth 
            THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) ELSE 0 END) AS PreviousRevenue

        FROM OrderItems oi
        JOIN OrdersTemp o ON o.OrderID = oi.OrderID
        JOIN AssignedOrders ao ON ao.OrderID = o.OrderID

        WHERE ao.DeliveryStatus != 'cancel'
        GROUP BY oi.ProductType
      `);

    // ====================================================
    // 4. SALES COMPARISON (CURRENT VS PREVIOUS 2 MONTHS)
    // ====================================================
    const salesCompareRes = await pool
      .request()
      .input("year", sql.Int, year)
      .input("month", sql.Int, month).query(`
        -- ================= CURRENT =================
SELECT 

  -- ITEM SALES (CURRENT)
  (SELECT SUM(TRY_CAST(oi.Total AS DECIMAL(18,2)))
   FROM OrderItems oi
   JOIN OrdersTemp o ON o.OrderID = oi.OrderID
   JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
   WHERE YEAR(o.OrderDate)=@year 
     AND MONTH(o.OrderDate)=@month
     AND LOWER(ao.DeliveryStatus) NOT IN ('cancel','cancelled')
  ) AS CurrentItemSales,

  -- DELIVERY (CURRENT)  ✅ NO DUPLICATION
  (SELECT SUM(TRY_CAST(o.DeliveryCharge AS DECIMAL(18,2)))
   FROM OrdersTemp o
   JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
   WHERE YEAR(o.OrderDate)=@year 
     AND MONTH(o.OrderDate)=@month
     AND LOWER(ao.DeliveryStatus) NOT IN ('cancel','cancelled')
  ) AS CurrentDelivery,

  -- ================= PREVIOUS =================

  -- ITEM SALES (PREV 2 MONTHS)
  (SELECT SUM(TRY_CAST(oi.Total AS DECIMAL(18,2)))
   FROM OrderItems oi
   JOIN OrdersTemp o ON o.OrderID = oi.OrderID
   JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
   WHERE o.OrderDate >= DATEADD(MONTH, -2, DATEFROMPARTS(@year,@month,1))
     AND o.OrderDate < DATEFROMPARTS(@year,@month,1)
     AND LOWER(ao.DeliveryStatus) NOT IN ('cancel','cancelled')
  ) AS PreviousItemSales,

  -- DELIVERY (PREV 2 MONTHS)
  (SELECT SUM(TRY_CAST(o.DeliveryCharge AS DECIMAL(18,2)))
   FROM OrdersTemp o
   JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
   WHERE o.OrderDate >= DATEADD(MONTH, -2, DATEFROMPARTS(@year,@month,1))
     AND o.OrderDate < DATEFROMPARTS(@year,@month,1)
     AND LOWER(ao.DeliveryStatus) NOT IN ('cancel','cancelled')
  ) AS PreviousDelivery
      `);

    const salesData = salesCompareRes.recordset[0] || {};

    const CurrentMonthSales =
      (salesData.CurrentItemSales || 0) + (salesData.CurrentDelivery || 0);

    const PreviousTwoMonthSales =
      (salesData.PreviousItemSales || 0) + (salesData.PreviousDelivery || 0);

    const growth =
      PreviousTwoMonthSales > 0
        ? ((CurrentMonthSales - PreviousTwoMonthSales) /
            PreviousTwoMonthSales) *
          100
        : 0;

    // ====================================================
    // 5. EGG + CHICKEN SUMMARY (PCS/KG + AMOUNT + AVG)
    // ====================================================
    const summaryRes = await pool
      .request()
      .input("year", sql.Int, year)
      .input("month", sql.Int, month)
      .input("prevYear", sql.Int, prevYear)
      .input("prevMonth", sql.Int, prevMonth).query(`
        SELECT 

        -- EGG PCS
        SUM(CASE 
            WHEN oi.ProductType IN ('Tray','Box','Box (Kids)','Box (Women)')
            AND YEAR(o.OrderDate)=@year AND MONTH(o.OrderDate)=@month
            THEN 
              CASE 
                WHEN oi.ProductType='Tray' THEN TRY_CAST(oi.Quantity AS INT)*30
                WHEN oi.ProductType='Box' THEN TRY_CAST(oi.Quantity AS INT)*6
                WHEN oi.ProductType IN ('Box (Kids)','Box (Women)') THEN TRY_CAST(oi.Quantity AS INT)*10
                ELSE 0 END
        ELSE 0 END) AS CurrentEggPCS,

        SUM(CASE 
            WHEN oi.ProductType IN ('Tray','Box','Box (Kids)','Box (Women)')
            AND YEAR(o.OrderDate)=@prevYear AND MONTH(o.OrderDate)=@prevMonth
            THEN 
              CASE 
                WHEN oi.ProductType='Tray' THEN TRY_CAST(oi.Quantity AS INT)*30
                WHEN oi.ProductType='Box' THEN TRY_CAST(oi.Quantity AS INT)*6
                WHEN oi.ProductType IN ('Box (Kids)','Box (Women)') THEN TRY_CAST(oi.Quantity AS INT)*10
                ELSE 0 END
        ELSE 0 END) AS PreviousEggPCS,

        -- EGG AMOUNT
        SUM(CASE 
            WHEN oi.ProductType IN ('Tray','Box','Box (Kids)','Box (Women)')
            AND YEAR(o.OrderDate)=@year AND MONTH(o.OrderDate)=@month
            THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) ELSE 0 END) AS CurrentEggAmount,

        SUM(CASE 
            WHEN oi.ProductType IN ('Tray','Box','Box (Kids)','Box (Women)')
            AND YEAR(o.OrderDate)=@prevYear AND MONTH(o.OrderDate)=@prevMonth
            THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) ELSE 0 END) AS PreviousEggAmount,

        -- CHICKEN KG
        SUM(CASE 
            WHEN oi.ProductType NOT IN ('Tray','Box','Box (Kids)','Box (Women)')
            AND YEAR(o.OrderDate)=@year AND MONTH(o.OrderDate)=@month
            THEN 
              CASE 
                WHEN oi.Weight LIKE '%Gram%' THEN TRY_CAST(REPLACE(oi.Weight,' Gram','') AS DECIMAL)/1000
                WHEN oi.Weight LIKE '%Kg%' THEN TRY_CAST(REPLACE(oi.Weight,' Kg','') AS DECIMAL)
                ELSE 0 END
        ELSE 0 END) AS CurrentChickenKG,

        SUM(CASE 
            WHEN oi.ProductType NOT IN ('Tray','Box','Box (Kids)','Box (Women)')
            AND YEAR(o.OrderDate)=@prevYear AND MONTH(o.OrderDate)=@prevMonth
            THEN 
              CASE 
                WHEN oi.Weight LIKE '%Gram%' THEN TRY_CAST(REPLACE(oi.Weight,' Gram','') AS DECIMAL)/1000
                WHEN oi.Weight LIKE '%Kg%' THEN TRY_CAST(REPLACE(oi.Weight,' Kg','') AS DECIMAL)
                ELSE 0 END
        ELSE 0 END) AS PreviousChickenKG,

        -- CHICKEN AMOUNT
        SUM(CASE 
            WHEN oi.ProductType NOT IN ('Tray','Box','Box (Kids)','Box (Women)')
            AND YEAR(o.OrderDate)=@year AND MONTH(o.OrderDate)=@month
            THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) ELSE 0 END) AS CurrentChickenAmount,

        SUM(CASE 
            WHEN oi.ProductType NOT IN ('Tray','Box','Box (Kids)','Box (Women)')
            AND YEAR(o.OrderDate)=@prevYear AND MONTH(o.OrderDate)=@prevMonth
            THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) ELSE 0 END) AS PreviousChickenAmount

        FROM OrderItems oi
        JOIN OrdersTemp o ON o.OrderID = oi.OrderID
        JOIN AssignedOrders ao ON ao.OrderID = o.OrderID

        WHERE ao.DeliveryStatus != 'cancel'
      `);

    // ====================================================
    // 6. BULK vs RETAIL (TRAY / BOX)
    // ====================================================
    const bulkRetailRes = await pool
      .request()
      .input("year", sql.Int, year)
      .input("month", sql.Int, month).query(`
SELECT 
  CASE 
    WHEN c.Bulk_Mode = 1 THEN 'BULK'
    ELSE 'RETAIL'
  END AS CustomerType,

  oi.ProductType,

  SUM(TRY_CAST(oi.Quantity AS INT)) AS TotalQty

FROM OrderItems oi
JOIN OrdersTemp o ON o.OrderID = oi.OrderID
JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
JOIN Customers c ON c.CustomerName = o.CustomerName   -- ⚠️ as per your schema

WHERE YEAR(o.OrderDate) = @year 
AND MONTH(o.OrderDate) = @month

-- cancel remove
AND LOWER(ISNULL(ao.DeliveryStatus,'')) NOT IN ('cancel','cancelled')

-- sirf tray/box
AND oi.ProductType IN ('Tray','Box','Box (Kids)','Box (Women)')

GROUP BY 
  CASE 
    WHEN c.Bulk_Mode = 1 THEN 'BULK'
    ELSE 'RETAIL'
  END,
  oi.ProductType

ORDER BY CustomerType, oi.ProductType
`);

    const s = summaryRes.recordset[0] || {};

    const summary = {
      egg: {
        current: {
          pcs: s.CurrentEggPCS || 0,
          amount: s.CurrentEggAmount || 0,
          avg: s.CurrentEggPCS > 0 ? s.CurrentEggAmount / s.CurrentEggPCS : 0,
        },
        previous: {
          pcs: s.PreviousEggPCS || 0,
          amount: s.PreviousEggAmount || 0,
          avg:
            s.PreviousEggPCS > 0 ? s.PreviousEggAmount / s.PreviousEggPCS : 0,
        },
      },
      chicken: {
        current: {
          kg: s.CurrentChickenKG || 0,
          amount: s.CurrentChickenAmount || 0,
          avg:
            s.CurrentChickenKG > 0
              ? s.CurrentChickenAmount / s.CurrentChickenKG
              : 0,
        },
        previous: {
          kg: s.PreviousChickenKG || 0,
          amount: s.PreviousChickenAmount || 0,
          avg:
            s.PreviousChickenKG > 0
              ? s.PreviousChickenAmount / s.PreviousChickenKG
              : 0,
        },
      },
    };

    // ====================================================
    // FINAL RESPONSE
    // ====================================================
    res.status(200).json({
      eggComparison: eggRes.recordset,
      chickenComparison: chickenRes.recordset,
      productRevenue: revenueRes.recordset,
      bulkRetail: bulkRetailRes.recordset,

      salesComparison: {
        CurrentMonthSales,
        PreviousTwoMonthSales,
        GrowthPercent: Number(growth.toFixed(2)),
      },

      summary,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getWeeklyCompareReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "startDate and endDate are required" });
    }

    const pool = await poolPromise;

    // ===============================
    // WEEK DATE RANGE
    // ===============================
    const currentStart = moment(startDate).format("DD MMM YYYY");
    const currentEnd = moment(endDate).format("DD MMM YYYY");

    const prevStartDate = moment(startDate).subtract(7, "days");
    const prevEndDate = moment(endDate).subtract(7, "days");

    const prevStart = prevStartDate.format("YYYY-MM-DD");
    const prevEnd = prevEndDate.format("YYYY-MM-DD");

    const prevStartLabel = prevStartDate.format("DD MMM YYYY");
    const prevEndLabel = prevEndDate.format("DD MMM YYYY");

    // ====================================================
    // 1. EGG COMPARISON
    // ====================================================
    const eggRes = await pool.request().query(`
SELECT 
  oi.ProductType,

SUM(CASE 
WHEN o.OrderDate BETWEEN '${startDate}' AND '${endDate}'
THEN TRY_CAST(oi.Quantity AS INT) ELSE 0 END) AS CurrentQty,

SUM(CASE 
WHEN o.OrderDate BETWEEN '${prevStart}' AND '${prevEnd}'
THEN TRY_CAST(oi.Quantity AS INT) ELSE 0 END) AS PreviousQty,

SUM(CASE 
WHEN o.OrderDate BETWEEN '${startDate}' AND '${endDate}'
THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) ELSE 0 END) AS CurrentAmount,

SUM(CASE 
WHEN o.OrderDate BETWEEN '${prevStart}' AND '${prevEnd}'
THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) ELSE 0 END) AS PreviousAmount

FROM OrderItems oi
JOIN OrdersTemp o ON o.OrderID = oi.OrderID
JOIN AssignedOrders ao ON ao.OrderID = o.OrderID

WHERE oi.ProductType IN ('Tray','Box','Box (Kids)','Box (Women)')
AND LOWER(ISNULL(ao.DeliveryStatus,'')) NOT IN ('cancel','cancelled')

GROUP BY oi.ProductType
`);

    // ====================================================
    // 2. CHICKEN COMPARISON
    // ====================================================
    const chickenRes = await pool.request().query(`
SELECT 
oi.ProductType,

SUM(CASE 
WHEN o.OrderDate BETWEEN '${startDate}' AND '${endDate}'
THEN TRY_CAST(oi.Quantity AS DECIMAL(18,2)) ELSE 0 END) CurrentQty,

SUM(CASE 
WHEN o.OrderDate BETWEEN '${prevStart}' AND '${prevEnd}'
THEN TRY_CAST(oi.Quantity AS DECIMAL(18,2)) ELSE 0 END) PreviousQty,

SUM(CASE 
WHEN o.OrderDate BETWEEN '${startDate}' AND '${endDate}'
THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) ELSE 0 END) CurrentAmount,

SUM(CASE 
WHEN o.OrderDate BETWEEN '${prevStart}' AND '${prevEnd}'
THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) ELSE 0 END) PreviousAmount

FROM OrderItems oi
JOIN OrdersTemp o ON o.OrderID = oi.OrderID
JOIN AssignedOrders ao ON ao.OrderID = o.OrderID

WHERE oi.ProductType NOT IN ('Tray','Box','Box (Kids)','Box (Women)')
AND LOWER(ISNULL(ao.DeliveryStatus,'')) NOT IN ('cancel','cancelled')

GROUP BY oi.ProductType
ORDER BY oi.ProductType
`);

    // ====================================================
    // 3. PRODUCT REVENUE
    // ====================================================
    const revenueRes = await pool.request().query(`
SELECT 
oi.ProductType,

SUM(CASE 
WHEN o.OrderDate BETWEEN '${startDate}' AND '${endDate}'
THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) ELSE 0 END) CurrentRevenue,

SUM(CASE 
WHEN o.OrderDate BETWEEN '${prevStart}' AND '${prevEnd}'
THEN TRY_CAST(oi.Total AS DECIMAL(18,2)) ELSE 0 END) PreviousRevenue

FROM OrderItems oi
JOIN OrdersTemp o ON o.OrderID = oi.OrderID
JOIN AssignedOrders ao ON ao.OrderID = o.OrderID

WHERE LOWER(ISNULL(ao.DeliveryStatus,'')) NOT IN ('cancel','cancelled')

GROUP BY oi.ProductType
`);

    // ====================================================
    // 4. SALES COMPARISON
    // ====================================================
    const salesRes = await pool.request().query(`
SELECT 

(SELECT SUM(TRY_CAST(oi.Total AS DECIMAL(18,2)))
FROM OrderItems oi
JOIN OrdersTemp o ON o.OrderID = oi.OrderID
JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
WHERE o.OrderDate BETWEEN '${startDate}' AND '${endDate}'
AND LOWER(ISNULL(ao.DeliveryStatus,'')) NOT IN ('cancel','cancelled')
) CurrentItemSales,

(SELECT SUM(TRY_CAST(o.DeliveryCharge AS DECIMAL(18,2)))
FROM OrdersTemp o
JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
WHERE o.OrderDate BETWEEN '${startDate}' AND '${endDate}'
AND LOWER(ISNULL(ao.DeliveryStatus,'')) NOT IN ('cancel','cancelled')
) CurrentDelivery,

(SELECT SUM(TRY_CAST(oi.Total AS DECIMAL(18,2)))
FROM OrderItems oi
JOIN OrdersTemp o ON o.OrderID = oi.OrderID
JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
WHERE o.OrderDate BETWEEN '${prevStart}' AND '${prevEnd}'
AND LOWER(ISNULL(ao.DeliveryStatus,'')) NOT IN ('cancel','cancelled')
) PreviousItemSales,

(SELECT SUM(TRY_CAST(o.DeliveryCharge AS DECIMAL(18,2)))
FROM OrdersTemp o
JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
WHERE o.OrderDate BETWEEN '${prevStart}' AND '${prevEnd}'
AND LOWER(ISNULL(ao.DeliveryStatus,'')) NOT IN ('cancel','cancelled')
) PreviousDelivery
`);

    const data = salesRes.recordset[0];

    const CurrentWeekSales =
      (data.CurrentItemSales || 0) + (data.CurrentDelivery || 0);

    const PreviousWeekSales =
      (data.PreviousItemSales || 0) + (data.PreviousDelivery || 0);

    const growth =
      PreviousWeekSales > 0
        ? ((CurrentWeekSales - PreviousWeekSales) / PreviousWeekSales) * 100
        : 0;

    // ====================================================
    // 5. BULK RETAIL
    // ====================================================
    const bulkRetailRes = await pool.request().query(`
SELECT 
CASE WHEN c.Bulk_Mode=1 THEN 'BULK' ELSE 'RETAIL' END CustomerType,
oi.ProductType,
SUM(TRY_CAST(oi.Quantity AS INT)) TotalQty

FROM OrderItems oi
JOIN OrdersTemp o ON o.OrderID = oi.OrderID
JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
JOIN Customers c ON c.CustomerName = o.CustomerName

WHERE o.OrderDate BETWEEN '${startDate}' AND '${endDate}'
AND LOWER(ISNULL(ao.DeliveryStatus,'')) NOT IN ('cancel','cancelled')
AND oi.ProductType IN ('Tray','Box','Box (Kids)','Box (Women)')

GROUP BY 
CASE WHEN c.Bulk_Mode=1 THEN 'BULK' ELSE 'RETAIL' END,
oi.ProductType
`);

    // ====================================================
    // FINAL RESPONSE
    // ====================================================
    res.status(200).json({
      weekRange: {
        currentWeek: {
          from: currentStart,
          to: currentEnd,
        },
        previousWeek: {
          from: prevStartLabel,
          to: prevEndLabel,
        },
      },

      eggComparison: eggRes.recordset,
      chickenComparison: chickenRes.recordset,
      productRevenue: revenueRes.recordset,
      bulkRetail: bulkRetailRes.recordset,

      salesComparison: {
        CurrentWeekSales,
        PreviousWeekSales,
        GrowthPercent: Number(growth.toFixed(2)),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
