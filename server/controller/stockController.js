const { poolPromise, sql } = require("../utils/db");

const generateInwardNo = async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // session calculation (April → next year)
  const sessionStartYear = month >= 4 ? year : year - 1;
  const sessionEndYear = sessionStartYear + 1;

  const session = `${String(sessionStartYear).slice(2)}-${String(
    sessionEndYear
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
  const { item_name, quantity, weight } = req.body;

  try {
    const inwardNo = await generateInwardNo();
    const pool = await poolPromise;

    // 1️⃣ Insert into Stock
    await pool
      .request()
      .input("inward_no", sql.VarChar, inwardNo)
      .input("item_name", sql.VarChar, item_name)
      .input("quantity", sql.Int, quantity)
      .input("weight", sql.VarChar, weight || "").query(`
        INSERT INTO Stock (inward_no, item_name, quantity, weight)
        VALUES (@inward_no, @item_name, @quantity, @weight)
      `);

    // 2️⃣ Insert into StockHistory
    await pool
      .request()
      .input("item_name", sql.VarChar, item_name)
      .input("weight", sql.VarChar, weight || "")
      .input("quantity", sql.Int, quantity)
      .input("type", sql.VarChar, "IN")
      .input("ref_no", sql.VarChar, inwardNo).query(`
        INSERT INTO StockHistory (item_name, weight, quantity, type, ref_no)
        VALUES (@item_name, @weight, @quantity, @type, @ref_no)
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
        .input("reason", sql.NVarChar,  item.reason || "").query(`
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