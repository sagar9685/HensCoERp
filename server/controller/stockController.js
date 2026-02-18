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
    if (!pool) {
      return res.status(500).json({ message: "Database connection failed." });
    }

    const result = await pool
      .request()
      .query("select * from Stock order by id desc");
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
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
      let remainingQty = item.quantity;

      // ✅ Check stock available
      const stockResult = await transaction
        .request()
        .input("item_name", sql.NVarChar, item.item_name).query(`
          SELECT ID, Quantity
          FROM Stock
          WHERE item_name = @item_name AND Quantity > 0
          ORDER BY ID ASC
        `);

      if (stockResult.recordset.length === 0) {
        throw new Error(`${item.item_name} is out of stock`);
      }

      // ✅ FIFO stock minus
      for (let row of stockResult.recordset) {
        if (remainingQty <= 0) break;

        const deductQty = Math.min(row.Quantity, remainingQty);

        await transaction
          .request()
          .input("qty", sql.Int, deductQty)
          .input("id", sql.Int, row.ID).query(`
            UPDATE Stock
            SET Quantity = Quantity - @qty
            WHERE ID = @id
          `);

        remainingQty -= deductQty;
      }

      if (remainingQty > 0) {
        throw new Error(`Not enough stock for ${item.item_name}`);
      }

      // ✅ Insert into RejectedStock
      await transaction
        .request()
        .input("reject_date", sql.Date, reject_date)
        .input("item_name", sql.NVarChar, item.item_name)
        .input("weight", sql.NVarChar, item.weight || "")
        .input("quantity", sql.Int, item.quantity)
        .input("reason", sql.NVarChar, item.reason || "").query(`
          INSERT INTO RejectedStock
          (reject_date, item_name, weight, quantity, reason)
          VALUES
          (@reject_date, @item_name, @weight, @quantity, @reason)
        `);
    }

    await transaction.commit();

    res.json({ message: "Rejected stock processed successfully" });
  } catch (error) {
    await transaction.rollback();
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

  if (!fromDate || !toDate) {
    return res.status(400).json({ message: "fromDate and toDate required" });
  }

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("fromDate", sql.Date, fromDate)
      .input("toDate", sql.Date, toDate).query(`
        SELECT 
            PT.ProductType,

            -- Current Dashboard Stock
            ISNULL((
                SELECT SUM(S.quantity)
                FROM Stock S
                WHERE S.item_name = PT.ProductType
            ), 0) AS Current_Stock,

            -- Actual Stock Came IN (During selected range)
            ISNULL((
                SELECT SUM(SH.quantity)
                FROM StockHistory SH
                WHERE SH.item_name = PT.ProductType
                AND SH.type = 'IN'
                AND CAST(SH.date AS DATE) BETWEEN @fromDate AND @toDate
            ), 0) AS Maal_Aaya,

            -- Actual Sales (During selected range)
            ISNULL((
                SELECT SUM(OI.Quantity)
                FROM OrderItems OI
                JOIN AssignedOrders AO ON AO.OrderID = OI.OrderID
                WHERE OI.ProductName = PT.ProductType
                AND AO.DeliveryStatus != 'Cancel' 
                AND CAST(AO.DeliveryDate AS DATE) BETWEEN @fromDate AND @toDate
            ), 0) AS Maal_Gaya

        FROM ProductTypes PT
        ORDER BY PT.ProductType
      `);

    const finalData = result.recordset.map((item) => {
      const closing = item.Current_Stock;
      const sold = item.Maal_Gaya;
      const inward = item.Maal_Aaya;

      // Agar history mismatch hai, toh opening ko negative hone se bachane ke liye logic:
      let opening = closing - inward + sold;

      // Safety check: Agar Opening negative hai matlab History data corrupt hai
      if (opening < 0) opening = 0;

      return {
        ProductType: item.ProductType,
        Opening: opening,
        Total_In: inward,
        Total_Sold: sold,
        Closing: closing,
      };
    });

    res.json(finalData);
  } catch (error) {
    console.error("Stock Movement Error:", error);
    res.status(500).json({ message: "Error generating report" });
  }
};
