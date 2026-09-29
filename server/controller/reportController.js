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

    // ✅ 1. SALES + ORDERS
    const salesRes = await request.query(`
      SELECT 
  ISNULL(SUM(oi.ItemTotal),0) + ISNULL(SUM(o.DeliveryCharge),0) AS TotalSales,
  COUNT(DISTINCT o.OrderID) AS TotalOrders
FROM OrdersTemp o
LEFT JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
LEFT JOIN (
  SELECT OrderID, SUM(TRY_CAST(Total AS DECIMAL(18,2))) AS ItemTotal
  FROM OrderItems
  GROUP BY OrderID
) oi ON oi.OrderID = o.OrderID
WHERE YEAR(o.OrderDate) = @year 
AND MONTH(o.OrderDate) = @month
AND ISNULL(ao.DeliveryStatus, '') != 'cancel'
    `);

    const totalSales = salesRes.recordset[0]?.TotalSales || 0;
    const totalOrders = salesRes.recordset[0]?.TotalOrders || 0;

    // ✅ 2. RTV (INFO ONLY - NOT used in sales)
    const rtvRes = await request.query(`
      SELECT ISNULL(SUM(TRY_CAST(Total AS DECIMAL(18,2))),0) AS RTVAmount
      FROM RTVEntries
      WHERE YEAR(RTVDate) = @year 
      AND MONTH(RTVDate) = @month
    `);

    // ✅ CREDIT / DEBIT NOTE AMOUNT
    const noteRes = await request.query(`
 SELECT
    ISNULL(SUM(
        CASE
            WHEN n.note_type = 'Credit'
            THEN TRY_CAST(n.amount AS DECIMAL(18,2))
                 - TRY_CAST(ISNULL(n.freight,0) AS DECIMAL(18,2))
            ELSE 0
        END
    ),0) AS CreditAmount,

    ISNULL(SUM(
        CASE
            WHEN n.note_type = 'Debit'
            THEN TRY_CAST(n.amount AS DECIMAL(18,2))
                 - TRY_CAST(ISNULL(n.freight,0) AS DECIMAL(18,2))
            ELSE 0
        END
    ),0) AS DebitAmount,

    ISNULL(SUM(
        TRY_CAST(ISNULL(n.freight,0) AS DECIMAL(18,2))
    ),0) AS FreightAmount

FROM credit_debit_notes n
LEFT JOIN AssignedOrders ao
    ON ao.OrderID = n.order_id
WHERE YEAR(n.created_at) = @year
AND MONTH(n.created_at) = @month
AND LOWER(ISNULL(ao.DeliveryStatus,'')) NOT IN ('cancel','cancelled')
`);

    const creditAmount = noteRes.recordset[0]?.CreditAmount || 0;
    const debitAmount = noteRes.recordset[0]?.DebitAmount || 0;

    const rtvAmount = rtvRes.recordset[0]?.RTVAmount || 0;

    const freightAmount = noteRes.recordset[0]?.FreightAmount || 0;

    // ✅ 3. CANCEL ORDER AMOUNT (INFO ONLY)
    const cancelRes = await request.query(`
      SELECT 
        ISNULL(SUM(oi.ItemTotal),0) AS CancelOrderAmount
      FROM OrdersTemp o
      JOIN AssignedOrders ao ON ao.OrderID = o.OrderID

      LEFT JOIN (
        SELECT OrderID, SUM(TRY_CAST(Total AS DECIMAL(18,2))) AS ItemTotal
        FROM OrderItems
        GROUP BY OrderID
      ) oi ON oi.OrderID = o.OrderID

      WHERE ao.DeliveryStatus = 'cancel'
      AND YEAR(o.OrderDate) = @year 
      AND MONTH(o.OrderDate) = @month
    `);

    const cancelAmount = cancelRes.recordset[0]?.CancelOrderAmount || 0;

    // ✅ 4. PAYMENTS
    const paymentsRes = await request.query(`
   SELECT 
  pm.ModeName, 
  ISNULL(SUM(TRY_CAST(op.Amount AS DECIMAL(18,2))),0) AS Amount
FROM OrderPayments op
JOIN PaymentModes pm ON pm.PaymentModeID = op.PaymentModeID
JOIN OrdersTemp o ON o.OrderID = op.OrderID
LEFT JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
WHERE YEAR(o.OrderDate) = @year 
AND MONTH(o.OrderDate) = @month
AND ISNULL(ao.DeliveryStatus, '') != 'cancel'
AND UPPER(pm.ModeName) <> 'FOC'
GROUP BY pm.ModeName
    `);

    // ✅ 5. TOTAL RECEIVED
    const receivedRes = await request.query(`
     SELECT 
  ISNULL(SUM(TRY_CAST(op.Amount AS DECIMAL(18,2))),0) AS TotalReceived
FROM OrderPayments op
JOIN PaymentModes pm ON pm.PaymentModeID = op.PaymentModeID
JOIN OrdersTemp o ON o.OrderID = op.OrderID
LEFT JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
WHERE YEAR(o.OrderDate) = @year 
AND MONTH(o.OrderDate) = @month
AND ISNULL(ao.DeliveryStatus, '') != 'cancel'
AND UPPER(pm.ModeName) <> 'FOC'
    `);

    const focRes = await request.query(`
  SELECT 
    ISNULL(SUM(TRY_CAST(op.Amount AS DECIMAL(18,2))),0) AS FOCAmount
  FROM OrderPayments op
  JOIN PaymentModes pm ON pm.PaymentModeID = op.PaymentModeID
  JOIN OrdersTemp o ON o.OrderID = op.OrderID
  LEFT JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
  WHERE YEAR(o.OrderDate) = @year 
  AND MONTH(o.OrderDate) = @month
  AND ISNULL(ao.DeliveryStatus, '') != 'cancel'
  AND UPPER(pm.ModeName) = 'FOC'
`);

    const focAmount = focRes.recordset[0]?.FOCAmount || 0;

    const totalReceived = receivedRes.recordset[0]?.TotalReceived || 0;

    // ✅ RTV sales se minus hoga
    const netSales =
      totalSales -
      rtvAmount -
      focAmount -
      creditAmount -
      freightAmount +
      debitAmount;

    // ✅ Outstanding bhi RTV minus ke baad niklega
    const totalOutstanding = netSales - totalReceived;
    // ✅ 6. CHICKEN & EGG SUMMARY

    const categoryRes = await request.query(`
  SELECT 

  ISNULL(SUM(
    CASE 
      WHEN oi.ProductType NOT IN ('Tray','Box','Box (Kids)','Box (Women)')
      THEN 
        CASE 
          WHEN oi.Weight LIKE '%Gram%' 
            THEN TRY_CAST(REPLACE(oi.Weight,' Gram','') AS DECIMAL(18,2)) / 1000
          WHEN oi.Weight LIKE '%Kg%' 
            THEN TRY_CAST(REPLACE(oi.Weight,' Kg','') AS DECIMAL(18,2))
          ELSE 0 
        END * TRY_CAST(oi.Quantity AS DECIMAL(18,2))
      ELSE 0 
    END
  ),0) AS ChickenKG,

  ISNULL(SUM(
    CASE 
      WHEN oi.ProductType NOT IN ('Tray','Box','Box (Kids)','Box (Women)')
      THEN TRY_CAST(oi.Total AS DECIMAL(18,2))
      ELSE 0 
    END
  ),0) AS ChickenAmount,

  ISNULL(SUM(
    CASE 
      WHEN oi.ProductType='Tray' THEN TRY_CAST(oi.Quantity AS DECIMAL(18,2)) * 30
      WHEN oi.ProductType='Box' THEN TRY_CAST(oi.Quantity AS DECIMAL(18,2)) * 6
      WHEN oi.ProductType IN ('Box (Kids)','Box (Women)') THEN TRY_CAST(oi.Quantity AS DECIMAL(18,2)) * 10
      ELSE 0 
    END
  ),0) AS TotalEggs,

  ISNULL(SUM(
    CASE 
      WHEN oi.ProductType IN ('Tray','Box','Box (Kids)','Box (Women)')
      THEN TRY_CAST(oi.Total AS DECIMAL(18,2))
      ELSE 0 
    END
  ),0) AS EggAmount

  FROM OrderItems oi
  JOIN OrdersTemp o ON o.OrderID = oi.OrderID
  LEFT JOIN AssignedOrders ao ON ao.OrderID = o.OrderID

  WHERE YEAR(o.OrderDate) = @year 
  AND MONTH(o.OrderDate) = @month
  AND LOWER(ISNULL(ao.DeliveryStatus,'')) NOT IN ('cancel','cancelled')
`);

    const cats = categoryRes.recordset[0] || {}; // ✅ YE LINE ADD KARO

    // ✅ DELIVERY CHARGE (SEPARATE)
    const deliveryRes = await request.query(`
  SELECT 
    ISNULL(SUM(TRY_CAST(o.DeliveryCharge AS DECIMAL(18,2))),0) AS DeliveryCharge
  FROM OrdersTemp o
  LEFT JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
  WHERE YEAR(o.OrderDate) = @year 
  AND MONTH(o.OrderDate) = @month
  AND ISNULL(ao.DeliveryStatus, '') != 'cancel'
`);

    const deliveryCharge = deliveryRes.recordset[0]?.DeliveryCharge || 0;

    // ✅ 7. PRODUCT TYPE SUMMARY
    const productTypeRes = await request.query(`
  SELECT 
    oi.ProductType,
    SUM(TRY_CAST(oi.Quantity AS DECIMAL(18,2))) AS TotalQty,
    SUM(TRY_CAST(oi.Total AS DECIMAL(18,2))) AS TotalAmount,
    AVG(TRY_CAST(oi.Rate AS DECIMAL(18,2))) AS AvgRate
  FROM OrderItems oi
  JOIN OrdersTemp o ON o.OrderID = oi.OrderID
  LEFT JOIN AssignedOrders ao ON ao.OrderID = o.OrderID
  WHERE YEAR(o.OrderDate) = @year 
  AND MONTH(o.OrderDate) = @month
  AND LOWER(ISNULL(ao.DeliveryStatus,'')) NOT IN ('cancel','cancelled')
  GROUP BY oi.ProductType
`);
    // ✅ FINAL RESPONSE
    res.status(200).json({
      summary: {
        TotalOrders: totalOrders,
        TotalSales: netSales,
        GrossSales: totalSales,
        CreditAmount: creditAmount,
        DebitAmount: debitAmount,
        FreightAmount: freightAmount, // ✅ Add this
        RTVAmount: rtvAmount, // info only
        FOCAmount: focAmount, // ✅ add this
        CancelOrderAmount: cancelAmount, // info only
        TotalReceived: totalReceived,
        TotalOutstanding: totalOutstanding,
        Difference: totalSales - (totalReceived + totalOutstanding),
        SalesCheck:
          (cats.ChickenAmount || 0) +
          (cats.EggAmount || 0) +
          (deliveryCharge || 0) -
          (rtvAmount || 0),
      },
      payment: paymentsRes.recordset,
      productTypeSummary: productTypeRes.recordset,
      chickenSummary: {
        TotalKG: cats.ChickenKG,
        TotalAmount: cats.ChickenAmount,
      },
      eggSummary: {
        TotalEggs: cats.TotalEggs,
        TotalAmount: cats.EggAmount,
      },
      deliverySummary: {
        TotalDeliveryCharge: deliveryCharge,
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
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (
      !Number.isInteger(year) ||
      year < 1900 ||
      year > 9998 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return res.status(400).json({
        message: "Valid year aur month required hain",
      });
    }

    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;

    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;

    const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    const pool = await poolPromise;

    // Orders aur master separately read kiye hain:
    // assignment/master joins se quantities multiply nahi hongi.
    const result = await pool
      .request()
      .input("startDate", sql.Date, startDate)
      .input("endDate", sql.Date, endDate).query(`
        SELECT
          DAY(o.OrderDate) AS OrderDay,
          oi.ItemID,
          oi.ProductType,
          oi.Weight,
          oi.Quantity
        FROM OrdersTemp o
        INNER JOIN OrderItems oi
          ON oi.OrderID = o.OrderID
        WHERE o.OrderDate >= @startDate
          AND o.OrderDate < @endDate
          AND NOT EXISTS (
            SELECT 1
            FROM AssignedOrders ao
            WHERE ao.OrderID = o.OrderID
              AND LOWER(LTRIM(RTRIM(
                ISNULL(ao.DeliveryStatus, '')
              ))) IN ('cancel', 'cancelled', 'canceled')
          );

        SELECT
          ProductType,
          DefaultWeight,
          Category
        FROM ProductTypes;
      `);

    const normalize = (value) =>
      String(value ?? "")
        .trim()
        .toLowerCase();

    const master = new Map();

    for (const product of result.recordsets[1]) {
      const name = normalize(product.ProductType);

      if (master.has(name)) {
        return res.status(422).json({
          message: `ProductTypes master mein duplicate product: ${product.ProductType}`,
        });
      }

      master.set(name, product);
    }

    const columns = [
      { key: "tray", label: "Tray", group: "Eggs", unit: "packs" },
      { key: "box", label: "Box", group: "Eggs", unit: "packs" },
      { key: "kids", label: "Box (K)", group: "Eggs", unit: "packs" },
      { key: "women", label: "Box (W)", group: "Eggs", unit: "packs" },

      { key: "curryCut", label: "Currycut", group: "Chicken", unit: "kg" },
      { key: "boneless", label: "Boneless", group: "Chicken", unit: "kg" },
      { key: "breast", label: "Breast", group: "Chicken", unit: "kg" },
      { key: "drumstick", label: "Drumstick", group: "Chicken", unit: "kg" },
      { key: "tikka", label: "Tikka", group: "Chicken", unit: "kg" },
      { key: "wings", label: "Wings", group: "Chicken", unit: "kg" },
      { key: "wholeBird", label: "Wholebird", group: "Chicken", unit: "kg" },
      {
        key: "restChicken",
        label: "Rest Chicken",
        group: "Chicken",
        unit: "kg",
      },
      { key: "lollipop", label: "Lollipop", group: "Chicken", unit: "kg" },
    ];

    const productMapping = {
      tray: "tray",
      box: "box",
      "box (kids)": "kids",
      "box (women)": "women",
      "curry cut": "curryCut",
      boneless: "boneless",
      breast: "breast",
      drumstick: "drumstick",
      tikka: "tikka",
      wings: "wings",
      "whole bird": "wholeBird",
      liver: "restChicken",
      gizzard: "restChicken",
      "pet food": "restChicken",
      lollipop: "lollipop",
    };

    const parseWeightKg = (value) => {
      const weight = normalize(value);

      const match = weight.match(
        /^(\d+(?:\.\d+)?|\.\d+)\s*(kg|kgs|kilogram|kilograms|g|gm|gms|gram|grams)$/,
      );

      if (!match) return null;

      const amount = Number(match[1]);
      if (amount <= 0) return null;

      return match[2].startsWith("k") ? amount : amount / 1000;
    };

    const emptyValues = () =>
      Object.fromEntries(columns.map(({ key }) => [key, 0]));

    const data = Array.from({ length: 4 }, (_, index) => ({
      week: index + 1,
      from: index * 7 + 1,
      to: index === 3 ? daysInMonth : (index + 1) * 7,
      ...emptyValues(),
    }));

    const issues = [];

    for (const item of result.recordsets[0]) {
      const name = normalize(item.ProductType);
      const product = master.get(name);
      const key = productMapping[name];
      const quantity = Number(item.Quantity);

      if (
        !product ||
        !key ||
        item.Quantity == null ||
        !Number.isFinite(quantity)
      ) {
        issues.push({
          ItemID: item.ItemID,
          ProductType: item.ProductType,
          message: "Product mapping/master ya quantity invalid hai",
        });
        continue;
      }

      const category = normalize(product.Category);
      const expectedCategory =
        columns.find((column) => column.key === key).group === "Eggs"
          ? "egg"
          : "chicken";

      if (category !== expectedCategory) {
        issues.push({
          ItemID: item.ItemID,
          ProductType: item.ProductType,
          message: "Master category report mapping se match nahi karti",
        });
        continue;
      }

      let soldQuantity = quantity;

      if (category === "chicken") {
        const itemWeight = String(item.Weight ?? "").trim();

        const weight = itemWeight || product.DefaultWeight;
        const weightKg = parseWeightKg(weight);

        if (weightKg === null) {
          issues.push({
            ItemID: item.ItemID,
            ProductType: item.ProductType,
            Weight: weight,
            message: "Chicken weight Gram ya KG mein required hai",
          });
          continue;
        }

        soldQuantity = quantity * weightKg;
      }

      const weekIndex = Math.min(
        Math.floor((Number(item.OrderDay) - 1) / 7),
        3,
      );

      data[weekIndex][key] += soldQuantity;
    }

    // Invalid weights ko silently zero bana kar wrong report nahi dikhayenge.
    if (issues.length) {
      return res.status(422).json({
        message:
          "Kuch order items ki mapping/weight invalid hai. Pehle unhe correct karein.",
        issueCount: issues.length,
        issues: issues.slice(0, 20),
      });
    }

    const round = (value) => Number(value.toFixed(3));
    const totals = emptyValues();

    for (const row of data) {
      for (const { key } of columns) {
        row[key] = round(row[key]);
        totals[key] += row[key];
      }
    }

    for (const { key } of columns) {
      totals[key] = round(totals[key]);
    }

    return res.status(200).json({
      year,
      month,
      columns,
      data,
      totals,
    });
  } catch (error) {
    console.error("Weekly Report Error:", error);

    return res.status(500).json({
      message: "Weekly report fetch nahi ho saki",
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
    // CREDIT / DEBIT NOTE AMOUNT
    // =====================================================
    const noteAmountResult = await request.query(`
 SELECT
ISNULL(SUM(
    CASE
        WHEN n.note_type = 'Credit'
        THEN TRY_CAST(n.amount AS DECIMAL(18,2))
             - TRY_CAST(ISNULL(n.freight,0) AS DECIMAL(18,2))
        ELSE 0
    END
),0) AS CreditAmount,

ISNULL(SUM(
    CASE
        WHEN n.note_type = 'Debit'
        THEN TRY_CAST(n.amount AS DECIMAL(18,2))
             - TRY_CAST(ISNULL(n.freight,0) AS DECIMAL(18,2))
        ELSE 0
    END
),0) AS DebitAmount,

ISNULL(SUM(
    TRY_CAST(ISNULL(n.freight,0) AS DECIMAL(18,2))
),0) AS FreightAmount

FROM credit_debit_notes n

LEFT JOIN AssignedOrders ao
    ON ao.OrderID = n.order_id
WHERE CAST(n.note_date  AS DATE) = @targetDate
AND ISNULL(ao.DeliveryStatus,'') != 'Cancel'
${boyFilter}
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
    // ✅ FOC AMOUNT (exclude from sales)

    const focAmount = focAmountResult.recordset[0]?.FOCAmount || 0;
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
    // 7 TOTAL rtv
    // =====================================================

    const rtvAmountResult = await request.query(`
SELECT 
ISNULL(SUM(TRY_CAST(r.Total AS DECIMAL(18,2))),0) AS RTVAmount
FROM RTVEntries r
LEFT JOIN AssignedOrders ao ON ao.OrderID = r.OrderID
WHERE CAST(r.RTVDate AS DATE) = @targetDate
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

    const grossSales = grossSalesResult.recordset[0]?.GrossSales || 0;
    const rtvAmount = rtvAmountResult.recordset[0]?.RTVAmount || 0;

    const creditAmount = noteAmountResult.recordset[0]?.CreditAmount || 0;
    const debitAmount = noteAmountResult.recordset[0]?.DebitAmount || 0;
    const freightAmount = noteAmountResult.recordset[0]?.FreightAmount || 0;
    const totalSaleAmount = Math.max(
      0,
      grossSales - rtvAmount - creditAmount - freightAmount + debitAmount,
    );
    const totalReceived =
      paymentCollectedResult.recordset[0]?.PaymentCollected || 0;
    const totalFOC = focAmountResult.recordset[0]?.FOCAmount || 0;

    const totalOrders = ordersCountResult.recordset[0]?.TotalOrders || 0;
    const revenueOrders =
      revenueOrdersCountResult.recordset[0]?.RevenueOrders || 0;

    const categorySummary = categorySummaryResult.recordset[0] || {};

    const totalChickenKG = categorySummary.TotalChickenKG || 0;
    const totalEggPCS = categorySummary.TotalEggPCS || 0;

    const pendingAmount = totalSaleAmount - totalReceived;

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
        creditAmount,
        debitAmount,
        freightAmount,
        rtvAmount: rtvAmount, // ✅ add this
        paymentCollected: totalReceived,
        totalOutstanding: totalOutstanding >= 0 ? totalOutstanding : 0,
        pendingAmount: pendingAmount, // ✅ NEW FIELD

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
      message: err.message,
      stack: err.stack,
    });
  }
};

exports.getCustomerWiseSummaryByDate = async (req, res) => {
  try {
    const { from, to, customer } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        message: "From and To date are required",
      });
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
              CAST(
                  CONCAT(
                      OI.ProductType,
                      ' [',
                      OI.Weight,
                      ' x ',
                      OI.Quantity,
                      ' @ ',
                      OI.Rate,
                      ']'
                  ) AS VARCHAR(MAX)
              ),
              ' | '
          ) AS ItemDetails,

          -- Payment Mode Details
          ISNULL((
              SELECT STRING_AGG(
                  CONCAT(PM.ModeName, ': ', OP_Sub.Amount),
                  ', '
              )
              FROM OrderPayments OP_Sub
              JOIN PaymentModes PM
                  ON OP_Sub.PaymentModeID = PM.PaymentModeID
              WHERE OP_Sub.OrderID = O.OrderID
          ), 'No Payment') AS PaymentModeDetails,

          -- Order Amount / Total Billed
          -- FOC excluded
          CASE 
              WHEN EXISTS (
                  SELECT 1
                  FROM OrderPayments OP
                  JOIN PaymentModes PM
                      ON OP.PaymentModeID = PM.PaymentModeID
                  WHERE OP.OrderID = O.OrderID
                    AND (
                        OP.PaymentModeID = 4
                        OR PM.IsRevenue = 0
                    )
              )
              THEN 0

              ELSE (
                  ISNULL((
                      SELECT SUM(Total)
                      FROM OrderItems
                      WHERE OrderID = O.OrderID
                  ), 0)
                  +
                  ISNULL(MAX(O.DeliveryCharge), 0)
              )
          END AS OrderAmount,

          -- Paid Amount
          -- FOC excluded
          ISNULL((
              SELECT SUM(OP.Amount)
              FROM OrderPayments OP
              JOIN PaymentModes PM
                  ON OP.PaymentModeID = PM.PaymentModeID
              WHERE OP.OrderID = O.OrderID
                AND OP.PaymentModeID != 4
                AND PM.IsRevenue = 1
          ), 0) AS PaidAmount,

          -- Short Amount
          ISNULL((
              SELECT SUM(ShortAmount)
              FROM OrderPayments
              WHERE OrderID = O.OrderID
          ), 0) AS ShortAmount,

          -- Outstanding Amount
          (
              CASE 
                  WHEN EXISTS (
                      SELECT 1
                      FROM OrderPayments OP
                      JOIN PaymentModes PM
                          ON OP.PaymentModeID = PM.PaymentModeID
                      WHERE OP.OrderID = O.OrderID
                        AND (
                            OP.PaymentModeID = 4
                            OR PM.IsRevenue = 0
                        )
                  )
                  THEN 0

                  ELSE (
                      ISNULL((
                          SELECT SUM(Total)
                          FROM OrderItems
                          WHERE OrderID = O.OrderID
                      ), 0)
                      +
                      ISNULL(MAX(O.DeliveryCharge), 0)
                  )
              END
          )
          -
          ISNULL((
              SELECT SUM(OP.Amount)
              FROM OrderPayments OP
              JOIN PaymentModes PM
                  ON OP.PaymentModeID = PM.PaymentModeID
              WHERE OP.OrderID = O.OrderID
                AND OP.PaymentModeID != 4
                AND PM.IsRevenue = 1
          ), 0) AS OutstandingAmount

      FROM OrdersTemp O WITH (NOLOCK)

      LEFT JOIN OrderItems OI WITH (NOLOCK)
          ON O.OrderID = OI.OrderID

      LEFT JOIN AssignedOrders A WITH (NOLOCK)
          ON O.OrderID = A.OrderID

      LEFT JOIN DeliveryMen DB WITH (NOLOCK)
          ON A.DeliveryManID = DB.DeliveryManID

      WHERE O.OrderDate BETWEEN @fromDate AND @toDate

        -- CANCELLED ORDERS COMPLETELY EXCLUDED
        AND NOT EXISTS (
            SELECT 1
            FROM AssignedOrders CA
            WHERE CA.OrderID = O.OrderID
              AND LOWER(
                  LTRIM(
                      RTRIM(
                          ISNULL(CA.DeliveryStatus, '')
                      )
                  )
              ) IN ('cancel', 'cancelled', 'canceled')
        )

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

    return res.status(200).json(result.recordset);
  } catch (err) {
    console.error("SQL Error:", err.message);

    return res.status(500).json({
      message: err.message,
    });
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
      return res.status(400).json({
        message: "Year and Month are required",
      });
    }

    const currentYear = Number(year);
    const currentMonth = Number(month);

    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const pool = await poolPromise;

    // ====================================================
    // 1. EGG COMPARISON
    // ====================================================
    const eggRes = await pool
      .request()
      .input("year", sql.Int, currentYear)
      .input("month", sql.Int, currentMonth)
      .input("prevYear", sql.Int, prevYear)
      .input("prevMonth", sql.Int, prevMonth).query(`
        SELECT 
          oi.ProductType,

          SUM(
            CASE 
              WHEN YEAR(o.OrderDate) = @year 
                AND MONTH(o.OrderDate) = @month
              THEN TRY_CAST(oi.Quantity AS DECIMAL(18,2))
              ELSE 0
            END
          ) AS CurrentQty,

          SUM(
            CASE 
              WHEN YEAR(o.OrderDate) = @prevYear 
                AND MONTH(o.OrderDate) = @prevMonth
              THEN TRY_CAST(oi.Quantity AS DECIMAL(18,2))
              ELSE 0
            END
          ) AS PreviousQty,

          SUM(
            CASE 
              WHEN YEAR(o.OrderDate) = @year 
                AND MONTH(o.OrderDate) = @month
              THEN TRY_CAST(oi.Total AS DECIMAL(18,2))
              ELSE 0
            END
          ) AS CurrentAmount,

          SUM(
            CASE 
              WHEN YEAR(o.OrderDate) = @prevYear 
                AND MONTH(o.OrderDate) = @prevMonth
              THEN TRY_CAST(oi.Total AS DECIMAL(18,2))
              ELSE 0
            END
          ) AS PreviousAmount

        FROM OrderItems oi

        JOIN OrdersTemp o
          ON o.OrderID = oi.OrderID

        LEFT JOIN AssignedOrders ao
          ON ao.OrderID = o.OrderID

        WHERE oi.ProductType IN (
          'Tray',
          'Box',
          'Box (Kids)',
          'Box (Women)'
        )

        AND LOWER(ISNULL(ao.DeliveryStatus,'')) 
            NOT IN ('cancel','cancelled')

        GROUP BY oi.ProductType

        ORDER BY oi.ProductType
      `);

    // ====================================================
    // 2. CHICKEN COMPARISON
    // ====================================================
    const chickenRes = await pool
      .request()
      .input("year", sql.Int, currentYear)
      .input("month", sql.Int, currentMonth)
      .input("prevYear", sql.Int, prevYear)
      .input("prevMonth", sql.Int, prevMonth).query(`
        SELECT 
          oi.ProductType,

          SUM(
            CASE 
              WHEN YEAR(o.OrderDate) = @year 
                AND MONTH(o.OrderDate) = @month
              THEN TRY_CAST(oi.Quantity AS DECIMAL(18,2))
              ELSE 0
            END
          ) AS CurrentQty,

          SUM(
            CASE 
              WHEN YEAR(o.OrderDate) = @prevYear 
                AND MONTH(o.OrderDate) = @prevMonth
              THEN TRY_CAST(oi.Quantity AS DECIMAL(18,2))
              ELSE 0
            END
          ) AS PreviousQty,

          SUM(
            CASE 
              WHEN YEAR(o.OrderDate) = @year 
                AND MONTH(o.OrderDate) = @month
              THEN TRY_CAST(oi.Total AS DECIMAL(18,2))
              ELSE 0
            END
          ) AS CurrentAmount,

          SUM(
            CASE 
              WHEN YEAR(o.OrderDate) = @prevYear 
                AND MONTH(o.OrderDate) = @prevMonth
              THEN TRY_CAST(oi.Total AS DECIMAL(18,2))
              ELSE 0
            END
          ) AS PreviousAmount

        FROM OrderItems oi

        JOIN OrdersTemp o
          ON o.OrderID = oi.OrderID

        LEFT JOIN AssignedOrders ao
          ON ao.OrderID = o.OrderID

        WHERE oi.ProductType NOT IN (
          'Tray',
          'Box',
          'Box (Kids)',
          'Box (Women)'
        )

        AND LOWER(ISNULL(ao.DeliveryStatus,'')) 
            NOT IN ('cancel','cancelled')

        GROUP BY oi.ProductType

        ORDER BY oi.ProductType
      `);

    // ====================================================
    // 3. PRODUCT REVENUE
    // ====================================================
    const revenueRes = await pool
      .request()
      .input("year", sql.Int, currentYear)
      .input("month", sql.Int, currentMonth)
      .input("prevYear", sql.Int, prevYear)
      .input("prevMonth", sql.Int, prevMonth).query(`
        SELECT 
          oi.ProductType,

          SUM(
            CASE 
              WHEN YEAR(o.OrderDate) = @year 
                AND MONTH(o.OrderDate) = @month
              THEN TRY_CAST(oi.Total AS DECIMAL(18,2))
              ELSE 0
            END
          ) AS CurrentRevenue,

          SUM(
            CASE 
              WHEN YEAR(o.OrderDate) = @prevYear 
                AND MONTH(o.OrderDate) = @prevMonth
              THEN TRY_CAST(oi.Total AS DECIMAL(18,2))
              ELSE 0
            END
          ) AS PreviousRevenue

        FROM OrderItems oi

        JOIN OrdersTemp o
          ON o.OrderID = oi.OrderID

        LEFT JOIN AssignedOrders ao
          ON ao.OrderID = o.OrderID

        WHERE LOWER(ISNULL(ao.DeliveryStatus,'')) 
              NOT IN ('cancel','cancelled')

        GROUP BY oi.ProductType

        ORDER BY oi.ProductType
      `);

    // ====================================================
    // 4. SALES COMPARISON
    // ====================================================
    //
    // EXACT SAME FORMULA AS getMonthlyReport:
    //
    // Gross Sales = Item Sales + Delivery
    //
    // Net Sales =
    // Gross Sales
    // - RTV
    // - FOC
    // - Credit
    // - Freight
    // + Debit
    //
    // ====================================================

    const salesCompareRes = await pool
      .request()
      .input("year", sql.Int, currentYear)
      .input("month", sql.Int, currentMonth)
      .input("prevYear", sql.Int, prevYear)
      .input("prevMonth", sql.Int, prevMonth).query(`

        SELECT

          -- =================================================
          -- CURRENT MONTH ITEM SALES
          -- =================================================
          (
            SELECT 
              ISNULL(
                SUM(
                  TRY_CAST(oi.Total AS DECIMAL(18,2))
                ),
                0
              )

            FROM OrderItems oi

            JOIN OrdersTemp o
              ON o.OrderID = oi.OrderID

            LEFT JOIN AssignedOrders ao
              ON ao.OrderID = o.OrderID

            WHERE YEAR(o.OrderDate) = @year
              AND MONTH(o.OrderDate) = @month

              -- SAME AS getMonthlyReport
              AND ISNULL(ao.DeliveryStatus,'') != 'cancel'

          ) AS CurrentItemSales,


          -- =================================================
          -- CURRENT MONTH DELIVERY
          -- =================================================
          (
            SELECT 
              ISNULL(
                SUM(
                  TRY_CAST(o.DeliveryCharge AS DECIMAL(18,2))
                ),
                0
              )

            FROM OrdersTemp o

            LEFT JOIN AssignedOrders ao
              ON ao.OrderID = o.OrderID

            WHERE YEAR(o.OrderDate) = @year
              AND MONTH(o.OrderDate) = @month

              -- SAME AS getMonthlyReport
              AND ISNULL(ao.DeliveryStatus,'') != 'cancel'

          ) AS CurrentDelivery,


          -- =================================================
          -- CURRENT MONTH RTV
          -- =================================================
          (
            SELECT 
              ISNULL(
                SUM(
                  TRY_CAST(Total AS DECIMAL(18,2))
                ),
                0
              )

            FROM RTVEntries

            WHERE YEAR(RTVDate) = @year
              AND MONTH(RTVDate) = @month

          ) AS CurrentRTV,


          -- =================================================
          -- CURRENT MONTH FOC
          -- =================================================
          (
            SELECT
              ISNULL(
                SUM(
                  TRY_CAST(op.Amount AS DECIMAL(18,2))
                ),
                0
              )

            FROM OrderPayments op

            JOIN PaymentModes pm
              ON pm.PaymentModeID = op.PaymentModeID

            JOIN OrdersTemp o
              ON o.OrderID = op.OrderID

            LEFT JOIN AssignedOrders ao
              ON ao.OrderID = o.OrderID

            WHERE YEAR(o.OrderDate) = @year
              AND MONTH(o.OrderDate) = @month

              -- SAME AS getMonthlyReport
              AND ISNULL(ao.DeliveryStatus,'') != 'cancel'

              AND UPPER(pm.ModeName) = 'FOC'

          ) AS CurrentFOC,


          -- =================================================
          -- CURRENT MONTH CREDIT NOTE
          -- =================================================
          (
            SELECT
              ISNULL(
                SUM(
                  CASE
                    WHEN n.note_type = 'Credit'
                    THEN
                      TRY_CAST(n.amount AS DECIMAL(18,2))
                      -
                      TRY_CAST(
                        ISNULL(n.freight,0)
                        AS DECIMAL(18,2)
                      )
                    ELSE 0
                  END
                ),
                0
              )

            FROM credit_debit_notes n

            LEFT JOIN AssignedOrders ao
              ON ao.OrderID = n.order_id

            WHERE YEAR(n.created_at) = @year
              AND MONTH(n.created_at) = @month

              AND LOWER(ISNULL(ao.DeliveryStatus,''))
                  NOT IN ('cancel','cancelled')

          ) AS CurrentCredit,


          -- =================================================
          -- CURRENT MONTH DEBIT NOTE
          -- =================================================
          (
            SELECT
              ISNULL(
                SUM(
                  CASE
                    WHEN n.note_type = 'Debit'
                    THEN
                      TRY_CAST(n.amount AS DECIMAL(18,2))
                      -
                      TRY_CAST(
                        ISNULL(n.freight,0)
                        AS DECIMAL(18,2)
                      )
                    ELSE 0
                  END
                ),
                0
              )

            FROM credit_debit_notes n

            LEFT JOIN AssignedOrders ao
              ON ao.OrderID = n.order_id

            WHERE YEAR(n.created_at) = @year
              AND MONTH(n.created_at) = @month

              AND LOWER(ISNULL(ao.DeliveryStatus,''))
                  NOT IN ('cancel','cancelled')

          ) AS CurrentDebit,


          -- =================================================
          -- CURRENT MONTH FREIGHT
          -- =================================================
          (
            SELECT
              ISNULL(
                SUM(
                  TRY_CAST(
                    ISNULL(n.freight,0)
                    AS DECIMAL(18,2)
                  )
                ),
                0
              )

            FROM credit_debit_notes n

            LEFT JOIN AssignedOrders ao
              ON ao.OrderID = n.order_id

            WHERE YEAR(n.created_at) = @year
              AND MONTH(n.created_at) = @month

              AND LOWER(ISNULL(ao.DeliveryStatus,''))
                  NOT IN ('cancel','cancelled')

          ) AS CurrentFreight,


          -- =================================================
          -- PREVIOUS MONTH ITEM SALES
          -- =================================================
          (
            SELECT 
              ISNULL(
                SUM(
                  TRY_CAST(oi.Total AS DECIMAL(18,2))
                ),
                0
              )

            FROM OrderItems oi

            JOIN OrdersTemp o
              ON o.OrderID = oi.OrderID

            LEFT JOIN AssignedOrders ao
              ON ao.OrderID = o.OrderID

            WHERE YEAR(o.OrderDate) = @prevYear
              AND MONTH(o.OrderDate) = @prevMonth

              AND ISNULL(ao.DeliveryStatus,'') != 'cancel'

          ) AS PreviousItemSales,


          -- =================================================
          -- PREVIOUS MONTH DELIVERY
          -- =================================================
          (
            SELECT 
              ISNULL(
                SUM(
                  TRY_CAST(o.DeliveryCharge AS DECIMAL(18,2))
                ),
                0
              )

            FROM OrdersTemp o

            LEFT JOIN AssignedOrders ao
              ON ao.OrderID = o.OrderID

            WHERE YEAR(o.OrderDate) = @prevYear
              AND MONTH(o.OrderDate) = @prevMonth

              AND ISNULL(ao.DeliveryStatus,'') != 'cancel'

          ) AS PreviousDelivery,


          -- =================================================
          -- PREVIOUS MONTH RTV
          -- =================================================
          (
            SELECT 
              ISNULL(
                SUM(
                  TRY_CAST(Total AS DECIMAL(18,2))
                ),
                0
              )

            FROM RTVEntries

            WHERE YEAR(RTVDate) = @prevYear
              AND MONTH(RTVDate) = @prevMonth

          ) AS PreviousRTV,


          -- =================================================
          -- PREVIOUS MONTH FOC
          -- =================================================
          (
            SELECT
              ISNULL(
                SUM(
                  TRY_CAST(op.Amount AS DECIMAL(18,2))
                ),
                0
              )

            FROM OrderPayments op

            JOIN PaymentModes pm
              ON pm.PaymentModeID = op.PaymentModeID

            JOIN OrdersTemp o
              ON o.OrderID = op.OrderID

            LEFT JOIN AssignedOrders ao
              ON ao.OrderID = o.OrderID

            WHERE YEAR(o.OrderDate) = @prevYear
              AND MONTH(o.OrderDate) = @prevMonth

              AND ISNULL(ao.DeliveryStatus,'') != 'cancel'

              AND UPPER(pm.ModeName) = 'FOC'

          ) AS PreviousFOC,


          -- =================================================
          -- PREVIOUS MONTH CREDIT
          -- =================================================
          (
            SELECT
              ISNULL(
                SUM(
                  CASE
                    WHEN n.note_type = 'Credit'
                    THEN
                      TRY_CAST(n.amount AS DECIMAL(18,2))
                      -
                      TRY_CAST(
                        ISNULL(n.freight,0)
                        AS DECIMAL(18,2)
                      )
                    ELSE 0
                  END
                ),
                0
              )

            FROM credit_debit_notes n

            LEFT JOIN AssignedOrders ao
              ON ao.OrderID = n.order_id

            WHERE YEAR(n.created_at) = @prevYear
              AND MONTH(n.created_at) = @prevMonth

              AND LOWER(ISNULL(ao.DeliveryStatus,''))
                  NOT IN ('cancel','cancelled')

          ) AS PreviousCredit,


          -- =================================================
          -- PREVIOUS MONTH DEBIT
          -- =================================================
          (
            SELECT
              ISNULL(
                SUM(
                  CASE
                    WHEN n.note_type = 'Debit'
                    THEN
                      TRY_CAST(n.amount AS DECIMAL(18,2))
                      -
                      TRY_CAST(
                        ISNULL(n.freight,0)
                        AS DECIMAL(18,2)
                      )
                    ELSE 0
                  END
                ),
                0
              )

            FROM credit_debit_notes n

            LEFT JOIN AssignedOrders ao
              ON ao.OrderID = n.order_id

            WHERE YEAR(n.created_at) = @prevYear
              AND MONTH(n.created_at) = @prevMonth

              AND LOWER(ISNULL(ao.DeliveryStatus,''))
                  NOT IN ('cancel','cancelled')

          ) AS PreviousDebit,


          -- =================================================
          -- PREVIOUS MONTH FREIGHT
          -- =================================================
          (
            SELECT
              ISNULL(
                SUM(
                  TRY_CAST(
                    ISNULL(n.freight,0)
                    AS DECIMAL(18,2)
                  )
                ),
                0
              )

            FROM credit_debit_notes n

            LEFT JOIN AssignedOrders ao
              ON ao.OrderID = n.order_id

            WHERE YEAR(n.created_at) = @prevYear
              AND MONTH(n.created_at) = @prevMonth

              AND LOWER(ISNULL(ao.DeliveryStatus,''))
                  NOT IN ('cancel','cancelled')

          ) AS PreviousFreight
      `);

    const salesData = salesCompareRes.recordset[0] || {};

    // ====================================================
    // CURRENT MONTH GROSS SALES
    // SAME AS getMonthlyReport totalSales
    // ====================================================
    const CurrentGrossSales =
      Number(salesData.CurrentItemSales || 0) +
      Number(salesData.CurrentDelivery || 0);

    // ====================================================
    // PREVIOUS MONTH GROSS SALES
    // ====================================================
    const PreviousGrossSales =
      Number(salesData.PreviousItemSales || 0) +
      Number(salesData.PreviousDelivery || 0);

    // ====================================================
    // CURRENT MONTH NET SALES
    //
    // EXACT SAME FORMULA AS getMonthlyReport
    // ====================================================
    const CurrentMonthSales =
      CurrentGrossSales -
      Number(salesData.CurrentRTV || 0) -
      Number(salesData.CurrentFOC || 0) -
      Number(salesData.CurrentCredit || 0) -
      Number(salesData.CurrentFreight || 0) +
      Number(salesData.CurrentDebit || 0);

    // ====================================================
    // PREVIOUS MONTH NET SALES
    //
    // SAME FORMULA
    // ====================================================
    const PreviousMonthSales =
      PreviousGrossSales -
      Number(salesData.PreviousRTV || 0) -
      Number(salesData.PreviousFOC || 0) -
      Number(salesData.PreviousCredit || 0) -
      Number(salesData.PreviousFreight || 0) +
      Number(salesData.PreviousDebit || 0);

    // ====================================================
    // GROWTH
    // ====================================================
    const growth =
      PreviousMonthSales !== 0
        ? ((CurrentMonthSales - PreviousMonthSales) / PreviousMonthSales) * 100
        : 0;

    // ====================================================
    // 5. EGG + CHICKEN SUMMARY
    // ====================================================
    const summaryRes = await pool
      .request()
      .input("year", sql.Int, currentYear)
      .input("month", sql.Int, currentMonth)
      .input("prevYear", sql.Int, prevYear)
      .input("prevMonth", sql.Int, prevMonth).query(`
        SELECT 

          -- =================================================
          -- CURRENT EGG PCS
          -- =================================================
          SUM(
            CASE 
              WHEN oi.ProductType IN (
                'Tray',
                'Box',
                'Box (Kids)',
                'Box (Women)'
              )

              AND YEAR(o.OrderDate) = @year 
              AND MONTH(o.OrderDate) = @month

              THEN 
                CASE 
                  WHEN oi.ProductType = 'Tray'
                    THEN TRY_CAST(oi.Quantity AS INT) * 30

                  WHEN oi.ProductType = 'Box'
                    THEN TRY_CAST(oi.Quantity AS INT) * 6

                  WHEN oi.ProductType IN (
                    'Box (Kids)',
                    'Box (Women)'
                  )
                    THEN TRY_CAST(oi.Quantity AS INT) * 10

                  ELSE 0 
                END

              ELSE 0 
            END
          ) AS CurrentEggPCS,


          -- =================================================
          -- PREVIOUS EGG PCS
          -- =================================================
          SUM(
            CASE 
              WHEN oi.ProductType IN (
                'Tray',
                'Box',
                'Box (Kids)',
                'Box (Women)'
              )

              AND YEAR(o.OrderDate) = @prevYear 
              AND MONTH(o.OrderDate) = @prevMonth

              THEN 
                CASE 
                  WHEN oi.ProductType = 'Tray'
                    THEN TRY_CAST(oi.Quantity AS INT) * 30

                  WHEN oi.ProductType = 'Box'
                    THEN TRY_CAST(oi.Quantity AS INT) * 6

                  WHEN oi.ProductType IN (
                    'Box (Kids)',
                    'Box (Women)'
                  )
                    THEN TRY_CAST(oi.Quantity AS INT) * 10

                  ELSE 0 
                END

              ELSE 0 
            END
          ) AS PreviousEggPCS,


          -- =================================================
          -- CURRENT EGG AMOUNT
          -- =================================================
          SUM(
            CASE 
              WHEN oi.ProductType IN (
                'Tray',
                'Box',
                'Box (Kids)',
                'Box (Women)'
              )

              AND YEAR(o.OrderDate) = @year 
              AND MONTH(o.OrderDate) = @month

              THEN TRY_CAST(
                oi.Total AS DECIMAL(18,2)
              )

              ELSE 0 
            END
          ) AS CurrentEggAmount,


          -- =================================================
          -- PREVIOUS EGG AMOUNT
          -- =================================================
          SUM(
            CASE 
              WHEN oi.ProductType IN (
                'Tray',
                'Box',
                'Box (Kids)',
                'Box (Women)'
              )

              AND YEAR(o.OrderDate) = @prevYear 
              AND MONTH(o.OrderDate) = @prevMonth

              THEN TRY_CAST(
                oi.Total AS DECIMAL(18,2)
              )

              ELSE 0 
            END
          ) AS PreviousEggAmount,


          -- =================================================
          -- CURRENT CHICKEN KG
          -- =================================================
          SUM(
            CASE 

              WHEN oi.ProductType NOT IN (
                'Tray',
                'Box',
                'Box (Kids)',
                'Box (Women)'
              )

              AND YEAR(o.OrderDate) = @year 
              AND MONTH(o.OrderDate) = @month

              THEN 
                CASE 

                  WHEN oi.Weight LIKE '%Gram%'
                  THEN
                    (
                      TRY_CAST(
                        REPLACE(
                          oi.Weight,
                          ' Gram',
                          ''
                        )
                        AS DECIMAL(18,2)
                      ) / 1000
                    )
                    *
                    TRY_CAST(
                      oi.Quantity
                      AS DECIMAL(18,2)
                    )

                  WHEN oi.Weight LIKE '%Kg%'
                  THEN
                    TRY_CAST(
                      REPLACE(
                        oi.Weight,
                        ' Kg',
                        ''
                      )
                      AS DECIMAL(18,2)
                    )
                    *
                    TRY_CAST(
                      oi.Quantity
                      AS DECIMAL(18,2)
                    )

                  ELSE 0 

                END

              ELSE 0 

            END
          ) AS CurrentChickenKG,


          -- =================================================
          -- PREVIOUS CHICKEN KG
          -- =================================================
          SUM(
            CASE 

              WHEN oi.ProductType NOT IN (
                'Tray',
                'Box',
                'Box (Kids)',
                'Box (Women)'
              )

              AND YEAR(o.OrderDate) = @prevYear 
              AND MONTH(o.OrderDate) = @prevMonth

              THEN 
                CASE 

                  WHEN oi.Weight LIKE '%Gram%'
                  THEN
                    (
                      TRY_CAST(
                        REPLACE(
                          oi.Weight,
                          ' Gram',
                          ''
                        )
                        AS DECIMAL(18,2)
                      ) / 1000
                    )
                    *
                    TRY_CAST(
                      oi.Quantity
                      AS DECIMAL(18,2)
                    )

                  WHEN oi.Weight LIKE '%Kg%'
                  THEN
                    TRY_CAST(
                      REPLACE(
                        oi.Weight,
                        ' Kg',
                        ''
                      )
                      AS DECIMAL(18,2)
                    )
                    *
                    TRY_CAST(
                      oi.Quantity
                      AS DECIMAL(18,2)
                    )

                  ELSE 0 

                END

              ELSE 0 

            END
          ) AS PreviousChickenKG,


          -- =================================================
          -- CURRENT CHICKEN AMOUNT
          -- =================================================
          SUM(
            CASE 

              WHEN oi.ProductType NOT IN (
                'Tray',
                'Box',
                'Box (Kids)',
                'Box (Women)'
              )

              AND YEAR(o.OrderDate) = @year 
              AND MONTH(o.OrderDate) = @month

              THEN TRY_CAST(
                oi.Total AS DECIMAL(18,2)
              )

              ELSE 0 

            END
          ) AS CurrentChickenAmount,


          -- =================================================
          -- PREVIOUS CHICKEN AMOUNT
          -- =================================================
          SUM(
            CASE 

              WHEN oi.ProductType NOT IN (
                'Tray',
                'Box',
                'Box (Kids)',
                'Box (Women)'
              )

              AND YEAR(o.OrderDate) = @prevYear 
              AND MONTH(o.OrderDate) = @prevMonth

              THEN TRY_CAST(
                oi.Total AS DECIMAL(18,2)
              )

              ELSE 0 

            END
          ) AS PreviousChickenAmount

        FROM OrderItems oi

        JOIN OrdersTemp o
          ON o.OrderID = oi.OrderID

        LEFT JOIN AssignedOrders ao
          ON ao.OrderID = o.OrderID

        WHERE LOWER(ISNULL(ao.DeliveryStatus,''))
              NOT IN ('cancel','cancelled')
      `);

    // ====================================================
    // 6. BULK vs RETAIL
    // ====================================================
    const bulkRetailRes = await pool
      .request()
      .input("year", sql.Int, currentYear)
      .input("month", sql.Int, currentMonth).query(`
        SELECT 

          CASE 
            WHEN c.Bulk_Mode = 1
              THEN 'BULK'
            ELSE 'RETAIL'
          END AS CustomerType,

          oi.ProductType,

          SUM(
            TRY_CAST(
              oi.Quantity AS INT
            )
          ) AS TotalQty

        FROM OrderItems oi

        JOIN OrdersTemp o
          ON o.OrderID = oi.OrderID

        LEFT JOIN AssignedOrders ao
          ON ao.OrderID = o.OrderID

        JOIN Customers c
          ON c.CustomerName = o.CustomerName

        WHERE YEAR(o.OrderDate) = @year 
          AND MONTH(o.OrderDate) = @month

          AND LOWER(ISNULL(ao.DeliveryStatus,''))
              NOT IN ('cancel','cancelled')

          AND oi.ProductType IN (
            'Tray',
            'Box',
            'Box (Kids)',
            'Box (Women)'
          )

        GROUP BY 

          CASE 
            WHEN c.Bulk_Mode = 1
              THEN 'BULK'
            ELSE 'RETAIL'
          END,

          oi.ProductType

        ORDER BY 
          CustomerType,
          oi.ProductType
      `);

    // ====================================================
    // SUMMARY DATA
    // ====================================================
    const s = summaryRes.recordset[0] || {};

    const summary = {
      egg: {
        current: {
          pcs: s.CurrentEggPCS || 0,
          amount: s.CurrentEggAmount || 0,

          avg:
            Number(s.CurrentEggPCS || 0) > 0
              ? Number(s.CurrentEggAmount || 0) / Number(s.CurrentEggPCS || 0)
              : 0,
        },

        previous: {
          pcs: s.PreviousEggPCS || 0,
          amount: s.PreviousEggAmount || 0,

          avg:
            Number(s.PreviousEggPCS || 0) > 0
              ? Number(s.PreviousEggAmount || 0) / Number(s.PreviousEggPCS || 0)
              : 0,
        },
      },

      chicken: {
        current: {
          kg: s.CurrentChickenKG || 0,
          amount: s.CurrentChickenAmount || 0,

          avg:
            Number(s.CurrentChickenKG || 0) > 0
              ? Number(s.CurrentChickenAmount || 0) /
                Number(s.CurrentChickenKG || 0)
              : 0,
        },

        previous: {
          kg: s.PreviousChickenKG || 0,
          amount: s.PreviousChickenAmount || 0,

          avg:
            Number(s.PreviousChickenKG || 0) > 0
              ? Number(s.PreviousChickenAmount || 0) /
                Number(s.PreviousChickenKG || 0)
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
        // ================================================
        // FINAL NET SALES
        // ================================================
        CurrentMonthSales,

        PreviousMonthSales,

        GrowthPercent: Number(growth.toFixed(2)),

        // ================================================
        // EXISTING DEBUG FIELDS
        // KEEPING THESE - NOTHING REMOVED
        // ================================================
        CurrentItemSales: salesData.CurrentItemSales || 0,

        CurrentDelivery: salesData.CurrentDelivery || 0,

        CurrentRTV: salesData.CurrentRTV || 0,

        PreviousItemSales: salesData.PreviousItemSales || 0,

        PreviousDelivery: salesData.PreviousDelivery || 0,

        PreviousRTV: salesData.PreviousRTV || 0,

        // ================================================
        // NEW DEBUG FIELDS
        // THESE HELP VERIFY MONTHLY REPORT
        // ================================================
        CurrentGrossSales,

        CurrentFOC: salesData.CurrentFOC || 0,

        CurrentCredit: salesData.CurrentCredit || 0,

        CurrentDebit: salesData.CurrentDebit || 0,

        CurrentFreight: salesData.CurrentFreight || 0,

        PreviousGrossSales,

        PreviousFOC: salesData.PreviousFOC || 0,

        PreviousCredit: salesData.PreviousCredit || 0,

        PreviousDebit: salesData.PreviousDebit || 0,

        PreviousFreight: salesData.PreviousFreight || 0,

        // ================================================
        // FORMULA CHECK
        // ================================================
        CurrentSalesCheck:
          CurrentGrossSales -
          Number(salesData.CurrentRTV || 0) -
          Number(salesData.CurrentFOC || 0) -
          Number(salesData.CurrentCredit || 0) -
          Number(salesData.CurrentFreight || 0) +
          Number(salesData.CurrentDebit || 0),

        PreviousSalesCheck:
          PreviousGrossSales -
          Number(salesData.PreviousRTV || 0) -
          Number(salesData.PreviousFOC || 0) -
          Number(salesData.PreviousCredit || 0) -
          Number(salesData.PreviousFreight || 0) +
          Number(salesData.PreviousDebit || 0),
      },

      summary,
    });
  } catch (err) {
    console.error("getMonthlyCompareReport Error:", err);

    res.status(500).json({
      message: err.message,
    });
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

exports.getCustomerWiseDateRangeReport = async (req, res) => {
  try {
    const { from, to, customer, status, productType } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "From & To required" });
    }

    const pool = await poolPromise;
    const request = pool.request();

    request.input("fromDate", sql.Date, from);
    request.input("toDate", sql.Date, to);

    let customerFilter = "";
    if (customer && customer !== "all") {
      request.input("customer", customer);
      customerFilter = "AND o.CustomerName = @customer";
    }

    let productTypeFilter = "";
    if (productType && productType !== "all") {
      request.input("productType", productType);
      productTypeFilter = "AND pt.ProductType = @productType";
    }

    let statusFilter = "";
    if (status === "cancel") {
      statusFilter = `
        AND LOWER(ISNULL(ao.DeliveryStatus,'')) 
        IN ('cancel','cancelled')
      `;
    } else {
      statusFilter = `
        AND LOWER(ISNULL(ao.DeliveryStatus,'')) 
        NOT IN ('cancel','cancelled')
      `;
    }

    const result = await request.query(`
SELECT 
CAST(o.OrderDate AS DATE) AS OrderDate,
o.CustomerName,
MAX(o.Area) AS Area,

pt.Category AS ProductName,
pt.ProductType,

COUNT(*) AS TotalOrders,
SUM(ISNULL(oi.Total,0)) AS TotalSales

FROM OrdersTemp o

INNER JOIN OrderItems oi 
ON oi.OrderID = o.OrderID

LEFT JOIN ProductTypes pt 
ON pt.ProductType = oi.ProductType

LEFT JOIN AssignedOrders ao 
ON ao.OrderID = o.OrderID

WHERE 
CAST(o.OrderDate AS DATE) BETWEEN @fromDate AND @toDate
${customerFilter}
${productTypeFilter}
${statusFilter}

GROUP BY 
CAST(o.OrderDate AS DATE),
o.CustomerName,
pt.Category,
pt.ProductType

ORDER BY OrderDate
`);

    res.json(result.recordset);
  } catch (err) {
    console.log("===== CUSTOMER REPORT ERROR =====");
    console.log("Query Params:", req.query);
    console.log("SQL Error:", err);
    console.log("Message:", err.message);
    console.log("Stack:", err.stack);

    res.status(500).json({ message: err.message });
  }
};

exports.getCustomerLedgerByDate = async (req, res) => {
  try {
    const { from, to, customerGroupId, customerId, customer } = req.query;

    // ----------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "From and To date are required",
      });
    }

    if (!customerGroupId && !customerId && !customer) {
      return res.status(400).json({
        success: false,
        message: "customerGroupId, customerId or customer is required",
      });
    }

    const pool = await poolPromise;
    const request = pool.request();

    request.input("fromDate", from);
    request.input("toDate", to);

    let customerFilter = "";
    let reportType = "";
    let reportName = "";

    // ====================================================
    // GROUP WISE LEDGER
    // ====================================================
    if (customerGroupId) {
      const groupId = Number(customerGroupId);

      if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid customerGroupId",
        });
      }

      const groupResult = await pool.request().input("groupId", groupId).query(`
          SELECT
            CustomerGroupID,
            GroupName
          FROM CustomerGroupMaster
          WHERE CustomerGroupID = @groupId
            AND IsActive = 1
        `);

      if (groupResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Customer group not found",
        });
      }

      request.input("customerGroupId", groupId);

      customerFilter = `
        EXISTS (
          SELECT 1
          FROM Customers C
          WHERE C.CustomerGroupID = @customerGroupId
            AND LTRIM(RTRIM(C.CustomerName))
                = LTRIM(RTRIM(O.CustomerName))
        )
      `;

      reportType = "GROUP";
      reportName = groupResult.recordset[0].GroupName;
    }

    // ====================================================
    // INDIVIDUAL CUSTOMER BY ID
    // ====================================================
    else if (customerId) {
      const id = Number(customerId);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid customerId",
        });
      }

      const customerResult = await pool.request().input("customerId", id)
        .query(`
          SELECT
            CustomerId,
            CustomerName,
            Area,
            Address,
            CustomerGroupID
          FROM Customers
          WHERE CustomerId = @customerId
        `);

      if (customerResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      const selectedCustomer = customerResult.recordset[0];

      request.input("customerId", id);

      // OrdersTemp me CustomerId nahi hai,
      // isliye Name + Area + Address se individual location match kar rahe hain.
      customerFilter = `
        EXISTS (
          SELECT 1
          FROM Customers C
          WHERE C.CustomerId = @customerId

            AND LTRIM(RTRIM(C.CustomerName))
                = LTRIM(RTRIM(O.CustomerName))

            AND LTRIM(RTRIM(ISNULL(C.Area, '')))
                = LTRIM(RTRIM(ISNULL(O.Area, '')))

            AND LTRIM(RTRIM(ISNULL(C.Address, '')))
                = LTRIM(RTRIM(ISNULL(O.Address, '')))
        )
      `;

      reportType = "CUSTOMER";

      reportName =
        selectedCustomer.CustomerName +
        (selectedCustomer.Area ? ` - ${selectedCustomer.Area}` : "");
    }

    // ====================================================
    // OLD CUSTOMER NAME MODE
    // ====================================================
    else {
      request.input("customer", customer.trim());

      customerFilter = `
        LTRIM(RTRIM(O.CustomerName))
        =
        LTRIM(RTRIM(@customer))
      `;

      reportType = "CUSTOMER_NAME";
      reportName = customer.trim();
    }

    // ====================================================
    // MAIN LEDGER QUERY
    // ====================================================
    const query = `
      ;WITH LedgerEntries AS (

        -- -------------------------------------------------
        -- SALE ENTRIES
        -- Date = OrderDate
        -- -------------------------------------------------
        SELECT
            O.CustomerName,

            O.OrderID,

            CAST(O.OrderDate AS DATE) AS LedgerDate,

            O.InvoiceNo,

            -- =============================================
            -- SALE NARRATION WITH ORDER ITEMS
            -- =============================================
            CAST(
              CONCAT(
                'Sale',

                CASE
                  WHEN O.Address IS NOT NULL
                       AND LTRIM(RTRIM(O.Address)) <> ''
                  THEN ' - ' + O.Address
                  ELSE ''
                END,

                CASE
                  WHEN EXISTS (
                    SELECT 1
                    FROM OrderItems OI
                    WHERE OI.OrderID = O.OrderID
                  )
                  THEN
                    ' | Items: ' +
                    ISNULL(
                      (
                        SELECT STRING_AGG(
                          CAST(
                            CONCAT(
                              ISNULL(OI2.ProductName, ''),

                              CASE
                                WHEN OI2.ProductType IS NOT NULL
                                     AND LTRIM(RTRIM(OI2.ProductType)) <> ''
                                THEN ' - ' + OI2.ProductType
                                ELSE ''
                              END,

                              ' [',

                              CASE
                                WHEN OI2.Weight IS NOT NULL
                                     AND LTRIM(RTRIM(OI2.Weight)) <> ''
                                THEN OI2.Weight + ' x '
                                ELSE ''
                              END,

                              CAST(
                                ISNULL(OI2.Quantity, 0)
                                AS VARCHAR(30)
                              ),

                              ' @ ',

                              CAST(
                                ISNULL(OI2.Rate, 0)
                                AS VARCHAR(30)
                              ),

                              ']'
                            )
                            AS VARCHAR(MAX)
                          ),
                          ' | '
                        )
                        FROM OrderItems OI2
                        WHERE OI2.OrderID = O.OrderID
                      ),
                      ''
                    )
                  ELSE ''
                END
              )
              AS VARCHAR(MAX)
            ) AS Narration,

            CAST(
              CASE

                -- FOC / NON REVENUE ORDER
                WHEN EXISTS (
                  SELECT 1
                  FROM OrderPayments FP

                  INNER JOIN PaymentModes FPM
                    ON FP.PaymentModeID = FPM.PaymentModeID

                  WHERE FP.OrderID = O.OrderID

                    AND (
                      FP.PaymentModeID = 4
                      OR FPM.IsRevenue = 0
                    )
                )
                THEN 0

                ELSE
                  ISNULL(
                    (
                      SELECT SUM(OI2.Total)
                      FROM OrderItems OI2
                      WHERE OI2.OrderID = O.OrderID
                    ),
                    0
                  )
                  +
                  ISNULL(O.DeliveryCharge, 0)

              END
              AS DECIMAL(18,2)
            ) AS SaleAmount,

            O.Area,

            CAST(
              0 AS DECIMAL(18,2)
            ) AS PaymentReceived,

            1 AS EntryOrder

        FROM OrdersTemp O WITH (NOLOCK)

        WHERE
            ${customerFilter}

            AND O.OrderDate >= @fromDate

            AND O.OrderDate <
              DATEADD(
                DAY,
                1,
                CAST(@toDate AS DATE)
              )

            -- CANCELLED ORDERS EXCLUDED
            AND NOT EXISTS (
              SELECT 1
              FROM AssignedOrders CA

              WHERE CA.OrderID = O.OrderID

                AND LOWER(
                  LTRIM(
                    RTRIM(
                      ISNULL(CA.DeliveryStatus, '')
                    )
                  )
                ) IN (
                  'cancel',
                  'cancelled',
                  'canceled'
                )
            )


        UNION ALL


        -- -------------------------------------------------
        -- PAYMENT RECEIVED ENTRIES
        -- Date = PaymentReceivedDate
        -- -------------------------------------------------
        SELECT
            O.CustomerName,

            O.OrderID,

            CAST(
              OP.PaymentReceivedDate AS DATE
            ) AS LedgerDate,

            O.InvoiceNo,

            CAST(
              CONCAT(
                'Payment Received - ',
                PM.ModeName,

                CASE
                  WHEN O.InvoiceNo IS NOT NULL
                       AND LTRIM(RTRIM(O.InvoiceNo)) <> ''
                  THEN
                    ' Against Invoice ' + O.InvoiceNo
                  ELSE ''
                END
              )
              AS VARCHAR(MAX)
            ) AS Narration,

            CAST(
              0 AS DECIMAL(18,2)
            ) AS SaleAmount,

            O.Area,

            CAST(
              SUM(ISNULL(OP.Amount, 0))
              AS DECIMAL(18,2)
            ) AS PaymentReceived,

            2 AS EntryOrder

        FROM OrderPayments OP WITH (NOLOCK)

        INNER JOIN OrdersTemp O WITH (NOLOCK)
          ON OP.OrderID = O.OrderID

        INNER JOIN PaymentModes PM WITH (NOLOCK)
          ON OP.PaymentModeID = PM.PaymentModeID

        WHERE
            ${customerFilter}

            AND OP.PaymentReceivedDate IS NOT NULL

            AND OP.PaymentReceivedDate >= @fromDate

            AND OP.PaymentReceivedDate <
              DATEADD(
                DAY,
                1,
                CAST(@toDate AS DATE)
              )

            -- FOC / NON REVENUE PAYMENT EXCLUDED
            AND OP.PaymentModeID != 4

            AND PM.IsRevenue = 1

            -- CANCELLED ORDERS EXCLUDED
            AND NOT EXISTS (
              SELECT 1
              FROM AssignedOrders CA

              WHERE CA.OrderID = O.OrderID

                AND LOWER(
                  LTRIM(
                    RTRIM(
                      ISNULL(CA.DeliveryStatus, '')
                    )
                  )
                ) IN (
                  'cancel',
                  'cancelled',
                  'canceled'
                )
            )

        GROUP BY
            O.CustomerName,
            O.OrderID,
            CAST(OP.PaymentReceivedDate AS DATE),
            O.InvoiceNo,
            O.Area,
            PM.ModeName
      )

      -- ---------------------------------------------------
      -- FINAL CUSTOMER LEDGER
      -- ---------------------------------------------------
      SELECT
          ROW_NUMBER() OVER (
            ORDER BY
              LedgerDate ASC,
              EntryOrder ASC,
              OrderID ASC
          ) AS SrNo,

          CustomerName,

          LedgerDate AS Date,

          InvoiceNo,

          Narration,

          SaleAmount,

          Area,

          PaymentReceived

      FROM LedgerEntries

      ORDER BY
          LedgerDate ASC,
          EntryOrder ASC,
          OrderID ASC;
    `;

    const result = await request.query(query);

    // ----------------------------------------------------
    // TOTALS
    // ----------------------------------------------------
    const totalSale = result.recordset.reduce(
      (sum, row) => sum + Number(row.SaleAmount || 0),
      0,
    );

    const totalPaymentReceived = result.recordset.reduce(
      (sum, row) => sum + Number(row.PaymentReceived || 0),
      0,
    );

    const balance = totalSale - totalPaymentReceived;

    return res.status(200).json({
      success: true,

      reportType,
      reportName,

      customerGroupId: customerGroupId ? Number(customerGroupId) : null,

      customerId: customerId ? Number(customerId) : null,

      fromDate: from,
      toDate: to,

      summary: {
        totalSale,
        totalPaymentReceived,
        balance,
      },

      ledger: result.recordset,
    });
  } catch (err) {
    console.error("Customer Ledger SQL Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
