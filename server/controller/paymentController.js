const { sql, poolPromise } = require("../utils/db");

exports.completeOrder = async (req, res) => {
  const {
    orderId,
    assignedOrderId,
    status,
    deliveryDate,
    remarks,
    paymentSettlement
  } = req.body;

  const { cashAmount, upiAmount, cardAmount } = paymentSettlement;

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const request = new sql.Request(transaction);

    // 1️⃣ Update AssignedOrders table
    await request
      .input("Status", sql.VarChar, status)
      .input("Remarks", sql.VarChar, remarks || null)
      .input("ActualDate", sql.Date, deliveryDate || null)
      .input("AssignedOrderID", sql.Int, assignedOrderId)
      .query(`
        UPDATE AssignedOrders
        SET DeliveryStatus = @Status,
            CompletionRemarks = @Remarks,
            ActualDeliveryDate = @ActualDate
        WHERE AssignID = @AssignedOrderID
      `);

    // 2️⃣ Insert Payment rows (only once)
    const insertPayment = async (mode, amount) => {
      if (amount > 0) {
        await new sql.Request(transaction)
          .input("OrderID", sql.Int, orderId)
          .input("AssignID", sql.Int, assignedOrderId)
          .input("PaymentModeID", sql.Int, mode)
          .input("Amount", sql.Decimal(10, 2), amount)
          .query(`
            INSERT INTO OrderPayments
              (OrderID, AssignID, PaymentModeID, Amount, CreatedAt)
            VALUES
              (@OrderID, @AssignID, @PaymentModeID, @Amount, GETDATE());
          `);
      }
    };

    await insertPayment(1, cashAmount); // Cash
    await insertPayment(2, upiAmount);  // UPI
    await insertPayment(3, cardAmount); // Card

    await transaction.commit();

    res.status(200).json({
      message: "Order completed & payments stored successfully!"
    });
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    res.status(500).json({
      message: "Failed to complete order",
      error: error.message
    });
  }
};


// 📌 GET all payment modes
exports.getPaymentModes = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM PaymentModes");
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
