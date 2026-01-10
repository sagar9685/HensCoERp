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
