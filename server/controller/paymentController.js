const { sql, poolPromise } = require("../utils/db");



exports.savePayments = async (req, res) => {
  try {
    const { OrderID, AssignedOrderID, payments } = req.body;

    if (!OrderID || !AssignedOrderID || !payments?.length) {
      return res.status(400).json({ message: "Invalid request body" });
    }

    const pool = await poolPromise;

    for (let p of payments) {
      await pool.request()
        .input("OrderID", sql.Int, OrderID)
        .input("AssignedOrderID", sql.Int, AssignedOrderID)
        .input("PaymentModeID", sql.Int, p.PaymentModeID)
        .input("Amount", sql.Decimal(10, 2), p.Amount)
        .query(`
          INSERT INTO OrderPayments (OrderID, AssignedOrderID, PaymentModeID, Amount)
          VALUES (@OrderID, @AssignedOrderID, @PaymentModeID, @Amount)
        `);
    }

    return res.json({ message: "Payments saved successfully" });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to save payments", error });
  }
};

 
exports.getPaymentModes = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM PaymentModes");
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


