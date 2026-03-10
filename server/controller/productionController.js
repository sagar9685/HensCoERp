const { sql, poolPromise } = require("../utils/db");

exports.addProduction = async (req, res) => {
  const { productionDate, category, noOfBirds, inputQuantity, wastage, items } =
    req.body;

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()

      .input("ProductionDate", sql.Date, productionDate)

      .input("Category", sql.VarChar, category)

      .input("NoOfBirds", sql.Int, noOfBirds || 0)

      .input("InputQuantity", sql.Decimal(10, 2), inputQuantity || 0)

      .input("Wastage", sql.Decimal(10, 2), wastage || 0).query(`
        INSERT INTO Production
        (ProductionDate, Category, NoOfBirds, InputQuantity, Wastage)

        OUTPUT INSERTED.ProductionID

        VALUES
        (@ProductionDate, @Category, @NoOfBirds, @InputQuantity, @Wastage)
      `);

    const productionId = result.recordset[0].ProductionID;

    for (let item of items) {
      await pool
        .request()

        .input("ProductionID", sql.Int, productionId)

        .input("ProductTypeId", sql.Int, item.productTypeId)

        .input("Quantity", sql.Decimal(10, 2), item.quantity || 0)

        .input("Weight", sql.Decimal(10, 2), item.weight || 0).query(`
          INSERT INTO ProductionDetails
          (ProductionID, ProductTypeId, Quantity, Weight)

          VALUES
          (@ProductionID, @ProductTypeId, @Quantity, @Weight)
        `);
    }

    res.json({
      message: "Production saved successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error saving production",
    });
  }
};
