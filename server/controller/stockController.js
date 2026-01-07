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
