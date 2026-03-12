const { sql, poolPromise } = require("../utils/db");

exports.addProduction = async (req, res) => {
  const { productionDate, category, noOfBirds, inputQuantity, wastage, items } =
    req.body;

  try {
    const pool = await poolPromise;

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Insert Production Header
      const result = await transaction
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
        if (!item.quantity || item.quantity == 0) continue;

        // 1️⃣ Insert Production Details
        await transaction
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

        // 2️⃣ Get Product Name
        const product = await transaction
          .request()
          .input("ProductTypeId", sql.Int, item.productTypeId)
          .query(
            `SELECT ProductType FROM ProductTypes WHERE ProductTypeId=@ProductTypeId`,
          );

        const itemName = product.recordset[0].ProductType;

        // 3️⃣ Update ProductionCurrentStock
        await transaction
          .request()
          .input("item_name", sql.VarChar, itemName)
          .input("qty", sql.Decimal(10, 2), item.quantity)
          .input("weight", sql.VarChar, item.weight || "").query(`
            MERGE ProductionCurrentStock AS target
            USING (SELECT @item_name AS item_name) AS source
            ON target.item_name = source.item_name

            WHEN MATCHED THEN
              UPDATE SET 
                quantity = quantity + @qty,
                updated_at = GETDATE()

            WHEN NOT MATCHED THEN
              INSERT (item_name, quantity, weight)
              VALUES (@item_name, @qty, @weight);
          `);
      }

      await transaction.commit();

      res.json({
        message: "Production saved successfully",
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error saving production",
    });
  }
};
