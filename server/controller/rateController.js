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
    return res
      .status(400)
      .json({ message: "ProductTypeId and rate are required" });
  }

  try {
    const pool = await poolPromise;

    await pool
      .request()
      .input("productTypeId", sql.Int, productTypeId)
      .input("rate", sql.Decimal(10, 2), rate).query(`
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
    const result = await pool
      .request()
      .input("productType", sql.NVarChar, productType).query(`
        SELECT TOP 1 Rate 
        FROM RateHistory rh
        JOIN ProductTypes pt ON rh.ProductTypeId = pt.ProductTypeId
        WHERE pt.ProductType = @productType
        ORDER BY rh.RateDate DESC;
      `);

    if (result.recordset.length > 0)
      res.status(200).json({ rate: result.recordset[0].Rate });
    else res.status(404).json({ message: "No rate found" });
  } catch (error) {
    res.status(500).json({ message: "Error fetching rate", error });
  }
};

exports.updateOrderRate = async (req, res) => {
  const { orderId, itemId, newRate, changedBy, reason } = req.body;

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const itemRes = await new sql.Request(transaction).input(
      "ItemID",
      sql.Int,
      itemId,
    ).query(`
        SELECT Quantity, Rate
        FROM OrderItems
        WHERE ItemID = @ItemID
      `);

    if (itemRes.recordset.length === 0) {
      throw new Error("Item not found");
    }

    const qty = parseFloat(itemRes.recordset[0].Quantity || 0);
    const oldRate = parseFloat(itemRes.recordset[0].Rate || 0);
    const updatedRate = parseFloat(newRate || 0);

    if (oldRate === updatedRate) {
      await transaction.rollback();
      return res.json({
        success: true,
        message: "No rate change",
      });
    }

    const newTotal = qty * updatedRate;

    // Update Rate + Total
    await new sql.Request(transaction)
      .input("Rate", sql.Decimal(18, 2), updatedRate)
      .input("Total", sql.Decimal(18, 2), newTotal)
      .input("ItemID", sql.Int, itemId).query(`
        UPDATE OrderItems
        SET Rate = @Rate,
            Total = @Total
        WHERE ItemID = @ItemID
      `);

    // Log Entry
    await new sql.Request(transaction)
      .input("orderId", sql.Int, orderId)
      .input("itemId", sql.Int, itemId)
      .input("oldQty", sql.Decimal(18, 2), qty)
      .input("newQty", sql.Decimal(18, 2), qty)
      .input("changedBy", sql.NVarChar, changedBy || "ADMIN")
      .input("reason", sql.NVarChar, reason || "")
      .input("oldRate", sql.Decimal(18, 2), oldRate)
      .input("newRate", sql.Decimal(18, 2), updatedRate).query(`
        INSERT INTO OrderEditLogs
        (
          OrderID,
          ItemID,
          OldQuantity,
          NewQuantity,
          ChangedBy,
          ChangeReason,
          ChangedAt,
          OldRate,
          NewRate
        )
        VALUES
        (
          @orderId,
          @itemId,
          @oldQty,
          @newQty,
          @changedBy,
          @reason,
          GETDATE(),
          @oldRate,
          @newRate
        )
      `);

    await transaction.commit();

    res.json({
      success: true,
      message: "Rate updated successfully",
      newTotal,
    });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
