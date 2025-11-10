const { poolPromise, sql } = require("../utils/db");

// ✅ Get all rate history (with ProductType & DefaultWeight)
exports.getAllRateHistory = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
          rh.RateId,
          pt.ProductType,
          pt.DefaultWeight,
          rh.Rate,
          rh.RateDate
      FROM RateHistory rh
      JOIN ProductTypes pt ON rh.ProductTypeId = pt.ProductTypeId
      ORDER BY rh.RateDate DESC;
    `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching rate history:", error);
    res.status(500).json({ message: "Error fetching rate history", error });
  }
};

// ✅ Add new rate entry (maintains history)
exports.addRate = async (req, res) => {
  const { productTypeId, rate } = req.body;

  if (!productTypeId || !rate) {
    return res.status(400).json({ message: "ProductTypeId and rate are required" });
  }

  try {
    const pool = await poolPromise;

    await pool.request()
      .input("productTypeId", sql.Int, productTypeId)
      .input("rate", sql.Decimal(10, 2), rate)
      .query(`
        INSERT INTO RateHistory (ProductTypeId, Rate, RateDate)
        VALUES (@productTypeId, @rate, GETDATE());
      `);

    res.status(201).json({ message: "Rate added successfully" });
  } catch (error) {
    console.error("Error adding rate:", error);
    res.status(500).json({ message: "Error adding rate", error });
  }
};

exports.getRateByProductType = async (req, res) => {
  const { productType } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("productType", sql.NVarChar, productType)
      .query(`
        SELECT TOP 1 Rate 
        FROM RateHistory rh
        JOIN ProductTypes pt ON rh.ProductTypeId = pt.ProductTypeId
        WHERE pt.ProductType = @productType
        ORDER BY rh.RateDate DESC;
      `);

    if (result.recordset.length > 0)
      res.status(200).json({ rate: result.recordset[0].Rate });
    else
      res.status(404).json({ message: "No rate found" });
  } catch (error) {
    res.status(500).json({ message: "Error fetching rate", error });
  }
};
