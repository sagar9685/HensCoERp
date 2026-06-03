const XLSX = require("xlsx");
const { sql, poolPromise } = require("../utils/db");

exports.getAreaName = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM Area");
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.importAreaExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Excel file is required" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(sheet);

    if (excelData.length === 0) {
      return res.status(400).json({ message: "Excel file is empty" });
    }

    const pool = await poolPromise;
    let inserted = 0;

    for (const row of excelData) {
      if (!row.areaName) continue;

      await pool
        .request()
        .input("areaName", sql.NVarChar, row.areaName)
        .query("INSERT INTO Area (areaName) VALUES (@areaName)");

      inserted++;
    }

    res.status(200).json({
      message: "Area imported successfully",
      totalInserted: inserted,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/orders?fromDate=2026-05-13&toDate=2026-05-13&bulkMode=0
exports.getBulkCustomer = async (req, res) => {
  try {
    const { fromDate, toDate, bulkMode } = req.query;

    let query = `
      WITH UniqueCustomers AS (
        SELECT 
          LTRIM(RTRIM(Contact_No)) AS Contact_No,
          MAX(CAST(Bulk_Mode AS int)) AS Bulk_Mode
        FROM Customers
        GROUP BY LTRIM(RTRIM(Contact_No))
      )
      SELECT ot.*, cm.Bulk_Mode
      FROM OrdersTemp ot
      JOIN UniqueCustomers cm
        ON LTRIM(RTRIM(ot.ContactNo)) = cm.Contact_No
      WHERE 1 = 1
    `;
    const pool = await poolPromise;
    const request = pool.request();

    if (fromDate) {
      query += ` AND CAST(ot.OrderDate AS date) >= @fromDate`;
      request.input("fromDate", sql.Date, fromDate);
    }

    if (toDate) {
      query += ` AND CAST(ot.OrderDate AS date) <= @toDate`;
      request.input("toDate", sql.Date, toDate);
    }

    if (bulkMode === "0" || bulkMode === "1") {
      query += ` AND cm.Bulk_Mode = @bulkMode`;
      request.input("bulkMode", sql.Int, Number(bulkMode));
    }

    query += ` ORDER BY ot.OrderDate DESC`;

    const result = await request.query(query);

    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Orders fetch failed",
      error: error.message,
    });
  }
};
