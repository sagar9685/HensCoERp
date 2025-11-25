const { sql, poolPromise } = require("../utils/db");


exports.completeOrder = async (req, res) => {
  const {
    orderId,
    assignedOrderId,
    status,
    paymentReceivedDate,
    remarks,
    paymentSettlement
  } = req.body;

  console.log("BODY RECEIVED ===>", req.body);
  console.log("PAYMENT SETTLEMENT LIST ===>", paymentSettlement);

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // ------------------------------------
    // 1️⃣ UPDATE ASSIGNED ORDERS TABLE
    // ------------------------------------
    await new sql.Request(transaction)
      .input("Status", sql.VarChar, status)
      .input("Remarks", sql.VarChar, remarks || null)
      .input("PaymentReceivedDate", sql.Date, paymentReceivedDate || null)
      .input("ActualDate", sql.Date, paymentReceivedDate || null)
      .input("AssignedOrderID", sql.Int, assignedOrderId)
      .query(`
        UPDATE AssignedOrders
        SET 
          DeliveryStatus = @Status,
          CompletionRemarks = @Remarks,
          PaymentReceivedDate = @PaymentReceivedDate,
          ActualDeliveryDate = @ActualDate
        WHERE AssignID = @AssignedOrderID
      `);

    // ------------------------------------
    // 2️⃣ GET PAYMENT MODES
    // ------------------------------------
    const paymentModesResult = await new sql.Request(transaction).query(`
      SELECT PaymentModeID, ModeName FROM PaymentModes
    `);

    const paymentModes = paymentModesResult.recordset;

    // ------------------------------------
    // 3️⃣ INSERT PAYMENT SETTLEMENT
    // ------------------------------------
    for (const [mode, amount] of Object.entries(paymentSettlement)) {
      if (amount > 0) {
        const modeData = paymentModes.find(
          (pm) => pm.ModeName.toLowerCase() === mode.toLowerCase()
        );

        if (!modeData) continue;

        await new sql.Request(transaction)
          .input("OrderID", sql.Int, orderId)
          .input("AssignID", sql.Int, assignedOrderId)
          .input("PaymentModeID", sql.Int, modeData.PaymentModeID)
          .input("Amount", sql.Decimal(10, 2), amount)
          .input("PaymentReceivedDate", sql.Date, paymentReceivedDate)
          .query(`
            INSERT INTO OrderPayments
              (OrderID, AssignID, PaymentModeID, Amount, PaymentReceivedDate, CreatedAt)
            VALUES
              (@OrderID, @AssignID, @PaymentModeID, @Amount, @PaymentReceivedDate, GETDATE());
          `);
      }
    }

    // ------------------------------------
    // 4️⃣ GET DELIVERY MAN ID
    // ------------------------------------
    const dmResult = await new sql.Request(transaction)
      .input("AssignID", sql.Int, assignedOrderId)
      .query(`
        SELECT DeliveryManID 
        FROM AssignedOrders 
        WHERE AssignID = @AssignID
      `);

    if (!dmResult.recordset.length) {
      throw new Error("Delivery Man not found!");
    }

    const deliveryManID = dmResult.recordset[0].DeliveryManID;

    // ------------------------------------
    // 5️⃣ CASH MODE → UPDATE BALANCE + HISTORY
    // ------------------------------------
    const cashAmount =
      paymentSettlement?.cash ||
      paymentSettlement?.Cash ||
      paymentSettlement?.CASH ||
      0;

    if (cashAmount > 0) {
      // ⭐ 5A: MERGE → auto insert + update
      await new sql.Request(transaction)
        .input("DeliveryManID", sql.Int, deliveryManID)
        .input("Amount", sql.Decimal(10, 2), cashAmount)
        .query(`
          MERGE DeliveryMenCashBalance AS target
          USING (SELECT @DeliveryManID AS DeliveryManID) AS src
          ON target.DeliveryManID = src.DeliveryManID
          WHEN MATCHED THEN
              UPDATE SET CurrentBalance = CurrentBalance + @Amount
          WHEN NOT MATCHED THEN
              INSERT (DeliveryManID, CurrentBalance)
              VALUES (src.DeliveryManID, @Amount);
        `);

      // ⭐ 5B: Insert Cash Handover History
      await new sql.Request(transaction)
        .input("DeliveryManID", sql.Int, deliveryManID)
        .input("Amount", sql.Decimal(10, 2), cashAmount)
        .input("Type", sql.VarChar, "CREDIT")
        .input("PaymentReceivedDate", sql.Date, paymentReceivedDate)
        .query(`
          INSERT INTO CashHandoverHistory
            (DeliveryManID, Amount, TransactionType, EntryDate)
          VALUES
            (@DeliveryManID, @Amount, @Type, @PaymentReceivedDate);
        `);
    }

    // ------------------------------------
    // 6️⃣ COMMIT TRANSACTION
    // ------------------------------------
    await transaction.commit();

    res.status(200).json({
      message: "Order completed, payments saved, cash balance updated!"
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


exports.getCashHistory = async (req, res) => {
  const { from, to } = req.query;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input("From", sql.Date, from)
      .input("To", sql.Date, to)
      .query(`
        SELECT H.*, DM.Name, DM.MobileNo
        FROM CashHandoverHistory H
        JOIN DeliveryMen DM ON H.DeliveryManID = DM.DeliveryManID
        WHERE EntryDate BETWEEN @From AND @To
        ORDER BY EntryDate DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getAllCashBalance = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT B.DeliveryManID, DM.Name, DM.MobileNo, DM.Area, B.CurrentBalance
      FROM DeliveryMenCashBalance B
      JOIN DeliveryMen DM ON DM.DeliveryManID = B.DeliveryManID
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.addDenominations = async (req, res) => {
  const { deliveryManId, denominations } = req.body;

  const {
    500: d500 = 0,
    200: d200 = 0,
    100: d100 = 0,
    50: d50 = 0,
    20: d20 = 0,
    10: d10 = 0,
    5: d5 = 0,
    2: d2 = 0,
    1: d1 = 0
  } = denominations;

  const total =
    (500 * d500) +
    (200 * d200) +
    (100 * d100) +
    (50 * d50) +
    (20 * d20) +
    (10 * d10) +
    (5 * d5) +
    (2 * d2) +
    (1 * d1);

  try {
    const pool = await poolPromise;

    await pool.request()
      .input("DeliveryManID", sql.Int, deliveryManId)
      .input("A500", sql.Int, d500)
      .input("A200", sql.Int, d200)
      .input("A100", sql.Int, d100)
      .input("A50", sql.Int, d50)
      .input("A20", sql.Int, d20)
      .input("A10", sql.Int, d10)
      .input("A5", sql.Int, d5)
      .input("A2", sql.Int, d2)
      .input("A1", sql.Int, d1)
      .input("Total", sql.Decimal(10,2), total)
      .query(`
        INSERT INTO CashDenominationHistory
          (DeliveryManID, Amount500, Amount200, Amount100, Amount50, Amount20, Amount10, Amount5, Amount2, Amount1, TotalAmount)
        VALUES
          (@DeliveryManID, @A500, @A200, @A100, @A50, @A20, @A10, @A5, @A2, @A1, @Total)
      `);

    res.json({ 
      message: "Denomination entry saved successfully!",
      totalAmount: total
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



 ;

 
exports.handoverCash = async (req, res) => {
  const { deliveryManId, totalHandoverAmount, denominationJSON, orderPaymentIds } = req.body;

  if (!deliveryManId || !totalHandoverAmount) {
    return res.status(400).json({ message: "DeliveryManID and Amount required!" });
  }

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1️⃣ Get current balance from DeliveryMenCashBalance
    const balanceResult = await new sql.Request(transaction)
      .input("DeliveryManID", sql.Int, deliveryManId)
      .query(`
        SELECT CurrentBalance 
        FROM DeliveryMenCashBalance 
        WHERE DeliveryManID = @DeliveryManID
      `);

    if (balanceResult.recordset.length === 0) {
      throw new Error("Delivery man balance record not found");
    }

    const currentBalance = balanceResult.recordset[0].CurrentBalance;

    // Check sufficient balance
    if (currentBalance < totalHandoverAmount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // 2️⃣ Subtract balance
    await new sql.Request(transaction)
      .input("DeliveryManID", sql.Int, deliveryManId)
      .input("Amount", sql.Decimal(10, 2), totalHandoverAmount)
      .query(`
        UPDATE DeliveryMenCashBalance
        SET CurrentBalance = CurrentBalance - @Amount
        WHERE DeliveryManID = @DeliveryManID
      `);

    // 3️⃣ Insert into CashDepartment
    await new sql.Request(transaction)
      .input("DeliveryManID", sql.Int, deliveryManId)
      .input("Amount", sql.Decimal(10, 2), totalHandoverAmount)
      .input("DenominationJSON", sql.NVarChar(sql.MAX), JSON.stringify(denominationJSON))
      .query(`
        INSERT INTO CashDepartment 
        (DeliveryManId, TotalHandoverAmount, DenominationJSON, CreatedAt)
        VALUES (@DeliveryManID, @Amount, @DenominationJSON, GETDATE())
      `);

    // 4️⃣ Mark OrderPayments as handed over
    if (orderPaymentIds?.length > 0) {
      await new sql.Request(transaction)
        .input("IDs", sql.VarChar, orderPaymentIds.join(','))
        .query(`
          UPDATE OrderPayments
          SET IsHandovered = 1
          WHERE PaymentID IN (SELECT value FROM STRING_SPLIT(@IDs, ','))
        `);
    }

    // 5️⃣ Insert history
    await new sql.Request(transaction)
      .input("DeliveryManID", sql.Int, deliveryManId)
      .input("Amount", sql.Decimal(10, 2), totalHandoverAmount)
      .input("Type", sql.VarChar, "DEBIT")
      .query(`
        INSERT INTO CashHandoverHistory
        (DeliveryManID, Amount, TransactionType, EntryDate)
        VALUES (@DeliveryManID, @Amount, @Type, GETDATE())
      `);

    // 6️⃣ Fetch updated balance
    const updatedBalanceResult = await new sql.Request(transaction)
      .input("DeliveryManID", sql.Int, deliveryManId)
      .query(`
        SELECT CurrentBalance 
        FROM DeliveryMenCashBalance 
        WHERE DeliveryManID = @DeliveryManID
      `);

    const updatedBalance = updatedBalanceResult.recordset[0].CurrentBalance;

    await transaction.commit();

    res.status(200).json({
      message: "Cash Handover Successful!",
      updatedBalance
    });

  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ message: "Handover failed", error: err.message });
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
