 const { sql, poolPromise } = require('../utils/db');

// ✅ Get all product types
exports.getAllProductTypes = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT ProductType FROM ProductTypes');
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching product types:', error);
    res.status(500).json({ message: 'Error fetching product types' });
  }
};

// ✅ Get default weight for a selected product type
exports.getWeightByProductType = async (req, res) => {
  const { type } = req.params;

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('type', sql.NVarChar, type)
     .query("SELECT DefaultWeight FROM ProductTypes WHERE REPLACE(ProductType, '-', '') = @type OR ProductType LIKE '%' + @type + '%'");
;

    if (result.recordset.length > 0) {
      res.json({ weight: result.recordset[0].DefaultWeight });
    } else {
      res.status(404).json({ message: 'Product type not found' });
    }
  } catch (error) {
    console.error('❌ Error fetching weight:', error);
    res.status(500).json({ message: 'Error fetching weight' });
  }
};

 