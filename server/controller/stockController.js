const { poolPromise, sql } = require("../utils/db");

const generateInwardNo = async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // session calculation (April → next year)
  const sessionStartYear = month >= 4 ? year : year - 1;
  const sessionEndYear = sessionStartYear + 1;

  const session = `${String(sessionStartYear).slice(2)}-${String(
    sessionEndYear,
  ).slice(2)}`;
  const prefix = `INV${session}/`;

  const pool = await poolPromise;

  const result = await pool.request().input("prefix", sql.VarChar, prefix + "%")
    .query(`
      SELECT TOP 1 inward_no 
      FROM Stock
      WHERE inward_no LIKE @prefix
      ORDER BY id DESC
    `);

  let nextNumber = 1;

  if (result.recordset.length > 0) {
    const last = result.recordset[0].inward_no;
    const parts = last.split("/");
    nextNumber = parseInt(parts[1]) + 1;
  }

  return `${prefix}${String(nextNumber).padStart(2, "0")}`;
};

exports.addStock = async (req, res) => {
  const { item_name, quantity, weight, chalan_no, chalan_date } = req.body;

  try {
    const inwardNo = await generateInwardNo();
    const pool = await poolPromise;

    // 1️⃣ Insert into Stock
    await pool
      .request()
      .input("inward_no", sql.VarChar, inwardNo)
      .input("item_name", sql.VarChar, item_name)
      .input("quantity", sql.Int, quantity)
      .input("weight", sql.VarChar, weight || "")
      .input("chalan_no", sql.VarChar, chalan_no || "")
      .input("chalan_date", sql.Date, chalan_date).query(`
        INSERT INTO Stock 
        (inward_no, item_name, quantity, weight, chalan_no, chalan_date)
        VALUES 
        (@inward_no, @item_name, @quantity, @weight, @chalan_no, @chalan_date)
      `);

    // 2️⃣ Insert into StockHistory
    await pool
      .request()
      .input("item_name", sql.VarChar, item_name)
      .input("weight", sql.VarChar, weight || "")
      .input("quantity", sql.Int, quantity)
      .input("type", sql.VarChar, "IN")
      .input("ref_no", sql.VarChar, inwardNo).query(`
        INSERT INTO StockHistory 
        (item_name, weight, quantity, type, ref_no)
        VALUES 
        (@item_name, @weight, @quantity, @type, @ref_no)
      `);

    res.json({ message: "Stock added successfully", inward_no: inwardNo });
  } catch (error) {
    console.error("Stock Add Error:", error);
    res.status(500).json({ error: "Error adding stock" });
  }
};

exports.getStock = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      DECLARE @FixedOpeningDate DATE = '2026-04-01';

      ;WITH Products AS (
          SELECT DISTINCT item_name FROM OpeningStock UNION SELECT DISTINCT item_name FROM StockHistory
      ),
      BaseOpening AS (
          SELECT item_name, ISNULL(opening_quantity, 0) as InitialQty FROM OpeningStock
      ),
      TotalInward AS (
          SELECT item_name, SUM(quantity) as InQty 
          FROM StockHistory 
          WHERE type IN ('IN', 'RTV') AND CAST(date AS DATE) >= @FixedOpeningDate
          GROUP BY item_name
      ),
      TotalOutward AS (
          -- Sale (Assigned) + Reject = Total Out
          SELECT ProductType, SUM(Qty) as OutQty FROM (
              SELECT OI.ProductType, SUM(OI.Quantity) as Qty
              FROM OrderItems OI
              JOIN OrdersTemp OT ON OT.OrderID = OI.OrderID
              INNER JOIN AssignedOrders AO ON OT.OrderID = AO.OrderID 
              WHERE CAST(OT.OrderDate AS DATE) >= @FixedOpeningDate AND ISNULL(AO.deliveryStatus, '') <> 'CANCEL'
              GROUP BY OI.ProductType
              UNION ALL
              SELECT item_name, SUM(quantity) FROM StockHistory 
              WHERE type = 'REJECT' AND CAST(date AS DATE) >= @FixedOpeningDate
              GROUP BY item_name
          ) AS CombinedOut GROUP BY ProductType
      )
      SELECT 
          P.item_name AS ProductName,
          (ISNULL(BO.InitialQty, 0) + ISNULL(TI.InQty, 0) - ISNULL(TOUT.OutQty, 0)) AS CurrentStock
      FROM Products P
      LEFT JOIN BaseOpening BO ON P.item_name = BO.item_name
      LEFT JOIN TotalInward TI ON P.item_name = TI.item_name
      LEFT JOIN TotalOutward TOUT ON P.item_name = TOUT.ProductType
      ORDER BY P.item_name
    `);
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getStockMovement = async (req, res) => {
  const { fromDate, toDate } = req.query;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("fromDate", sql.Date, fromDate)
      .input("toDate", sql.Date, toDate)
      .query(`
      DECLARE @FixedOpeningDate DATE = '2026-04-01';

      ;WITH Products AS (
          SELECT DISTINCT item_name FROM OpeningStock UNION SELECT DISTINCT item_name FROM StockHistory
      ),
      BaseOpening AS (
          SELECT item_name, ISNULL(opening_quantity, 0) as InitialQty FROM OpeningStock
      ),
      HistoryBefore AS (
          SELECT item_name, 
                 SUM(CASE WHEN type IN ('IN', 'RTV') THEN quantity ELSE 0 END) as PrevIn,
                 SUM(CASE WHEN type = 'REJECT' THEN quantity ELSE 0 END) as PrevReject
          FROM StockHistory
          WHERE CAST(date AS DATE) >= @FixedOpeningDate AND CAST(date AS DATE) < @fromDate
          GROUP BY item_name
      ),
      SalesBefore AS (
          SELECT OI.ProductType, SUM(OI.Quantity) as PrevSold
          FROM OrderItems OI
          JOIN OrdersTemp OT ON OT.OrderID = OI.OrderID
          INNER JOIN AssignedOrders AO ON OT.OrderID = AO.OrderID 
          WHERE CAST(OT.OrderDate AS DATE) >= @FixedOpeningDate AND CAST(OT.OrderDate AS DATE) < @fromDate
            AND ISNULL(AO.deliveryStatus, '') <> 'CANCEL'
          GROUP BY OI.ProductType
      )
      SELECT 
          P.item_name AS ProductType,
          (ISNULL(BO.InitialQty, 0) + ISNULL(HB.PrevIn, 0) - (ISNULL(SB.PrevSold, 0) + ISNULL(HB.PrevReject, 0))) AS Opening,
          
          ISNULL((SELECT SUM(quantity) FROM StockHistory WHERE item_name = P.item_name AND type IN ('IN', 'RTV') AND CAST(date AS DATE) BETWEEN @fromDate AND @toDate), 0) AS Total_In,
          
          -- Total_Sell = Real Sell + Rejects
          (ISNULL((SELECT SUM(OI.Quantity) FROM OrderItems OI JOIN OrdersTemp OT ON OT.OrderID = OI.OrderID INNER JOIN AssignedOrders AO ON OT.OrderID = AO.OrderID 
                   WHERE OI.ProductType = P.item_name AND CAST(OT.OrderDate AS DATE) BETWEEN @fromDate AND @toDate AND ISNULL(AO.deliveryStatus, '') <> 'CANCEL'), 0) +
           ISNULL((SELECT SUM(quantity) FROM StockHistory WHERE item_name = P.item_name AND type = 'REJECT' AND CAST(date AS DATE) BETWEEN @fromDate AND @toDate), 0)
          ) AS Total_Sell
      FROM Products P
      LEFT JOIN BaseOpening BO ON P.item_name = BO.item_name
      LEFT JOIN HistoryBefore HB ON P.item_name = HB.item_name
      LEFT JOIN SalesBefore SB ON P.item_name = SB.ProductType
      ORDER BY P.item_name
    `);

    const finalData = result.recordset.map(item => ({
      ProductType: item.ProductType,
      Opening: Number(item.Opening),
      Total_In: Number(item.Total_In),
      Total_Sell: Number(item.Total_Sell),
      Closing: Number(item.Opening) + Number(item.Total_In) - Number(item.Total_Sell)
    }));
    res.json(finalData);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.rejectStock = async (req, res) => {
  const { reject_date, items } = req.body;
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items required" });
    }

    await transaction.begin();

    for (let item of items) {
      let remainingQty = parseFloat(item.quantity);
      const itemName = item.item_name;

      // FIFO stock minus from Physical Stock Table
      const stockRes = await transaction.request()
        .input("item_name", sql.NVarChar, itemName)
        .query(`
          SELECT ID, Quantity FROM Stock 
          WHERE UPPER(LTRIM(RTRIM(item_name))) = UPPER(LTRIM(RTRIM(@item_name))) AND Quantity > 0
          ORDER BY ID ASC
        `);

      for (let row of stockRes.recordset) {
        if (remainingQty <= 0) break;
        const deductQty = Math.min(row.Quantity, remainingQty);
        await transaction.request()
          .input("qty", sql.Decimal(18, 2), deductQty)
          .input("id", sql.Int, row.ID)
          .query(`UPDATE Stock SET Quantity = Quantity - @qty WHERE ID = @id`);
        remainingQty -= deductQty;
      }

      if (remainingQty > 0) throw new Error(`Not enough physical stock for ${itemName}`);

      // ⭐ INSERT INTO STOCK HISTORY (For Dashboard/Movement Sync)
      await transaction.request()
        .input("hItem", sql.NVarChar, itemName)
        .input("hQty", sql.Decimal(18, 2), item.quantity)
        .input("hDate", sql.Date, reject_date)
        .input("hWeight", sql.NVarChar, item.weight || "")
        .query(`
          INSERT INTO StockHistory (item_name, quantity, type, date, weight, ref_no)
          VALUES (@hItem, @hQty, 'REJECT', @hDate, @hWeight, 'STOCK-REJECT')
        `);

      // Log into RejectedStock table
      await transaction.request()
        .input("r_date", sql.Date, reject_date)
        .input("r_name", sql.NVarChar, itemName)
        .input("r_qty", sql.Decimal(18, 2), item.quantity)
        .input("r_reason", sql.NVarChar, item.reason || "")
        .query(`
          INSERT INTO RejectedStock (reject_date, item_name, quantity, reason)
          VALUES (@r_date, @r_name, @r_qty, @r_reason)
        `);
    }

    await transaction.commit();
    res.json({ success: true, message: "Rejected stock processed successfully" });
  } catch (error) {
    if (transaction) await transaction.rollback();
    res.status(400).json({ message: error.message });
  }
};


exports.getAvailableStock = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        item_name,
        SUM(quantity) AS available_stock
      FROM Stock
      GROUP BY item_name
      ORDER BY item_name ASC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Stock Fetch Error:", error);
    res.status(500).json({ error: "Error fetching available stock" });
  }
};

exports.rejectStock = async (req, res) => {
  const { reject_date, items } = req.body;
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items required" });
    }

    await transaction.begin();

    for (let item of items) {
      let remainingQty = parseFloat(item.quantity);
      const itemName = item.item_name;

      // FIFO stock minus from Physical Stock Table
      const stockRes = await transaction.request()
        .input("item_name", sql.NVarChar, itemName)
        .query(`
          SELECT ID, Quantity FROM Stock 
          WHERE UPPER(LTRIM(RTRIM(item_name))) = UPPER(LTRIM(RTRIM(@item_name))) AND Quantity > 0
          ORDER BY ID ASC
        `);

      for (let row of stockRes.recordset) {
        if (remainingQty <= 0) break;
        const deductQty = Math.min(row.Quantity, remainingQty);
        await transaction.request()
          .input("qty", sql.Decimal(18, 2), deductQty)
          .input("id", sql.Int, row.ID)
          .query(`UPDATE Stock SET Quantity = Quantity - @qty WHERE ID = @id`);
        remainingQty -= deductQty;
      }

      if (remainingQty > 0) throw new Error(`Not enough physical stock for ${itemName}`);

      // ⭐ INSERT INTO STOCK HISTORY (For Dashboard/Movement Sync)
      await transaction.request()
        .input("hItem", sql.NVarChar, itemName)
        .input("hQty", sql.Decimal(18, 2), item.quantity)
        .input("hDate", sql.Date, reject_date)
        .input("hWeight", sql.NVarChar, item.weight || "")
        .query(`
          INSERT INTO StockHistory (item_name, quantity, type, date, weight, ref_no)
          VALUES (@hItem, @hQty, 'REJECT', @hDate, @hWeight, 'STOCK-REJECT')
        `);

      // Log into RejectedStock table
      await transaction.request()
        .input("r_date", sql.Date, reject_date)
        .input("r_name", sql.NVarChar, itemName)
        .input("r_qty", sql.Decimal(18, 2), item.quantity)
        .input("r_reason", sql.NVarChar, item.reason || "")
        .query(`
          INSERT INTO RejectedStock (reject_date, item_name, quantity, reason)
          VALUES (@r_date, @r_name, @r_qty, @r_reason)
        `);
    }

    await transaction.commit();
    res.json({ success: true, message: "Rejected stock processed successfully" });
  } catch (error) {
    if (transaction) await transaction.rollback();
    res.status(400).json({ message: error.message });
  }
};

exports.getrejectStock = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ message: "Database connection failed." });
    }

    const result = await pool
      .request()
      .query("  select * from RejectedStock order by id desc");
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.getStockMovement = async (req, res) => {
  const { fromDate, toDate } = req.query;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("fromDate", sql.Date, fromDate)
      .input("toDate", sql.Date, toDate)
      .query(`
      DECLARE @FixedOpeningDate DATE = '2026-04-01';

      ;WITH Products AS (
          SELECT DISTINCT item_name FROM OpeningStock UNION SELECT DISTINCT item_name FROM StockHistory
      ),
      BaseOpening AS (
          SELECT item_name, ISNULL(opening_quantity, 0) as InitialQty FROM OpeningStock
      ),
      HistoryBefore AS (
          SELECT item_name, 
                 SUM(CASE WHEN type IN ('IN', 'RTV') THEN quantity ELSE 0 END) as PrevIn,
                 SUM(CASE WHEN type = 'REJECT' THEN quantity ELSE 0 END) as PrevReject
          FROM StockHistory
          WHERE CAST(date AS DATE) >= @FixedOpeningDate AND CAST(date AS DATE) < @fromDate
          GROUP BY item_name
      ),
      SalesBefore AS (
          SELECT OI.ProductType, SUM(OI.Quantity) as PrevSold
          FROM OrderItems OI
          JOIN OrdersTemp OT ON OT.OrderID = OI.OrderID
          INNER JOIN AssignedOrders AO ON OT.OrderID = AO.OrderID 
          WHERE CAST(OT.OrderDate AS DATE) >= @FixedOpeningDate AND CAST(OT.OrderDate AS DATE) < @fromDate
            AND ISNULL(AO.deliveryStatus, '') <> 'CANCEL'
          GROUP BY OI.ProductType
      )
      SELECT 
          P.item_name AS ProductType,
          (ISNULL(BO.InitialQty, 0) + ISNULL(HB.PrevIn, 0) - (ISNULL(SB.PrevSold, 0) + ISNULL(HB.PrevReject, 0))) AS Opening,
          
          ISNULL((SELECT SUM(quantity) FROM StockHistory WHERE item_name = P.item_name AND type IN ('IN', 'RTV') AND CAST(date AS DATE) BETWEEN @fromDate AND @toDate), 0) AS Total_In,
          
          -- Total_Sell = Real Sell + Rejects
          (ISNULL((SELECT SUM(OI.Quantity) FROM OrderItems OI JOIN OrdersTemp OT ON OT.OrderID = OI.OrderID INNER JOIN AssignedOrders AO ON OT.OrderID = AO.OrderID 
                   WHERE OI.ProductType = P.item_name AND CAST(OT.OrderDate AS DATE) BETWEEN @fromDate AND @toDate AND ISNULL(AO.deliveryStatus, '') <> 'CANCEL'), 0) +
           ISNULL((SELECT SUM(quantity) FROM StockHistory WHERE item_name = P.item_name AND type = 'REJECT' AND CAST(date AS DATE) BETWEEN @fromDate AND @toDate), 0)
          ) AS Total_Sell
      FROM Products P
      LEFT JOIN BaseOpening BO ON P.item_name = BO.item_name
      LEFT JOIN HistoryBefore HB ON P.item_name = HB.item_name
      LEFT JOIN SalesBefore SB ON P.item_name = SB.ProductType
      ORDER BY P.item_name
    `);

    const finalData = result.recordset.map(item => ({
      ProductType: item.ProductType,
      Opening: Number(item.Opening),
      Total_In: Number(item.Total_In),
      Total_Sell: Number(item.Total_Sell),
      Closing: Number(item.Opening) + Number(item.Total_In) - Number(item.Total_Sell)
    }));
    res.json(finalData);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getProductionCurrentStock = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT id, item_name, quantity, weight, updated_at
      FROM ProductionCurrentStock
      ORDER BY item_name ASC
    `);

    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: "Error fetching current stock" });
  }
};

// 2. Dispatch to Headoffice (Good in Transit)
exports.dispatchStock = async (req, res) => {
  const { vehicle_no, driver_name, chalan_no, items } = req.body;

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      const inwardNo = "DISP-" + Date.now();

      for (let item of items) {
        const { item_name, quantity } = item;

        // Check Stock
        const stockCheck = await transaction
          .request()
          .input("item_name", sql.VarChar, item_name)
          .query(
            "SELECT quantity FROM ProductionCurrentStock WHERE item_name=@item_name",
          );

        const currentQty = stockCheck.recordset[0]?.quantity || 0;

        if (currentQty < quantity) {
          throw new Error(`Insufficient stock for ${item_name}`);
        }

        // 1️⃣ Minus ProductionCurrentStock
        await transaction
          .request()
          .input("item_name", sql.VarChar, item_name)
          .input("qty", sql.Decimal(10, 2), quantity).query(`
            UPDATE ProductionCurrentStock
            SET quantity = quantity - @qty,
                updated_at = GETDATE()
            WHERE item_name = @item_name
          `);

        // 2️⃣ Insert into Stock
        await transaction
          .request()
          .input("inward_no", sql.VarChar, inwardNo)
          .input("item_name", sql.VarChar, item_name)
          .input("quantity", sql.Decimal(10, 2), quantity)
          .input("chalan_no", sql.VarChar, chalan_no)
          .input("vehicle_no", sql.VarChar, vehicle_no)
          .input("driver_name", sql.VarChar, driver_name).query(`
            INSERT INTO Stock
            (inward_no, item_name, quantity, chalan_no, vehicle_no, driver_name, status)
            VALUES
            (@inward_no, @item_name, @quantity, @chalan_no, @vehicle_no, @driver_name, 'TRANSIT')
          `);

        // 3️⃣ StockHistory OUT
        await transaction
          .request()
          .input("item_name", sql.VarChar, item_name)
          .input("qty", sql.Decimal(10, 2), quantity)
          .input("ref_no", sql.VarChar, inwardNo).query(`
            INSERT INTO StockHistory (item_name, quantity, type, ref_no, date)
            VALUES (@item_name, @qty, 'OUT', @ref_no, GETDATE())
          `);
      }

      await transaction.commit();

      res.json({
        message: "Dispatch successful",
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Dispatch failed",
    });
  }
};
