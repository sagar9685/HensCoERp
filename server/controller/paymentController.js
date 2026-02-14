const { sql, poolPromise } = require("../utils/db");

exports.completeOrder = async (req, res) => {
  const {
    orderId,
    assignedOrderId,
    status,
    paymentReceivedDate,
    remarks,
    paymentSettlement,
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
      .input("AssignedOrderID", sql.Int, assignedOrderId).query(`
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
          (pm) => pm.ModeName.toLowerCase() === mode.toLowerCase().trim(),
        );

        if (!modeData) continue;

        let paymentVerifyStatus = "Pending";
        let shortAmount = 0;

        // ✅ Only PaymentModeID = 1 (Cash)
        if (modeData.PaymentModeID === 1) {
          paymentVerifyStatus = "Verified";
        }

        await new sql.Request(transaction)
          .input("OrderID", sql.Int, orderId)
          .input("AssignID", sql.Int, assignedOrderId)
          .input("PaymentModeID", sql.Int, modeData.PaymentModeID)
          .input("Amount", sql.Decimal(10, 2), amount)
          .input("PaymentReceivedDate", sql.Date, paymentReceivedDate)
          .input("VerifyStatus", sql.VarChar, paymentVerifyStatus)
          .input("ShortAmount", sql.Decimal(10, 2), shortAmount).query(`
        INSERT INTO OrderPayments
          (OrderID, AssignID, PaymentModeID, Amount, 
           PaymentReceivedDate, PaymentVerifyStatus, ShortAmount, CreatedAt)
        VALUES
          (@OrderID, @AssignID, @PaymentModeID, @Amount,
           @PaymentReceivedDate, @VerifyStatus, @ShortAmount, GETDATE());
      `);
      }
    }

    // ------------------------------------
    // 4️⃣ GET DELIVERY MAN ID
    // ------------------------------------
    const dmResult = await new sql.Request(transaction).input(
      "AssignID",
      sql.Int,
      assignedOrderId,
    ).query(`
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
        .input("Amount", sql.Decimal(10, 2), cashAmount).query(`
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
        .input("PaymentReceivedDate", sql.Date, paymentReceivedDate).query(`
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
      message: "Order completed, payments saved, cash balance updated!",
    });
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    res.status(500).json({
      message: "Failed to complete order",
      error: error.message,
    });
  }
};

exports.getCashHistory = async (req, res) => {
  const { from, to } = req.query;

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("From", sql.Date, from)
      .input("To", sql.Date, to).query(`
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
    1: d1 = 0,
  } = denominations;

  const total =
    500 * d500 +
    200 * d200 +
    100 * d100 +
    50 * d50 +
    20 * d20 +
    10 * d10 +
    5 * d5 +
    2 * d2 +
    1 * d1;

  try {
    const pool = await poolPromise;

    await pool
      .request()
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
      .input("Total", sql.Decimal(10, 2), total).query(`
        INSERT INTO CashDenominationHistory
          (DeliveryManID, Amount500, Amount200, Amount100, Amount50, Amount20, Amount10, Amount5, Amount2, Amount1, TotalAmount)
        VALUES
          (@DeliveryManID, @A500, @A200, @A100, @A50, @A20, @A10, @A5, @A2, @A1, @Total)
      `);

    res.json({
      message: "Denomination entry saved successfully!",
      totalAmount: total,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.verifyPayment = async (req, res) => {
  const { paymentId, receivedAmount } = req.body;

  if (!paymentId || receivedAmount == null) {
    return res
      .status(400)
      .json({ message: "paymentId and receivedAmount required" });
  }

  try {
    const pool = await poolPromise;

    // 1. Fetch payment details with PaymentModeID and ModeName
    const payment = await pool.request().input("paymentId", sql.Int, paymentId)
      .query(`
        SELECT 
          op.Amount, 
          op.PaymentModeID,
          op.PaymentSummary,
          pm.ModeName
        FROM OrderPayments op
        JOIN PaymentModes pm ON op.PaymentModeID = pm.PaymentModeID
        WHERE op.PaymentID = @paymentId
      `);

    if (payment.recordset.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const originalAmount = payment.recordset[0].Amount;
    const paymentModeID = payment.recordset[0].PaymentModeID;
    const modeName = payment.recordset[0].ModeName;
    const paymentSummary = payment.recordset[0].PaymentSummary;

    let status = "Verified";
    let shortAmount = 0;

    // Check if it's a split payment (multiple payment modes)
    const isSplitPayment = paymentSummary && paymentSummary.includes("|");

    // CASE 1: Split payment (multiple modes) - Always require manual verification
    if (isSplitPayment) {
      return res.json({
        message: "Split payment detected. Manual verification required.",
        paymentId,
        requiresManualVerification: true,
        modeName,
        isSplitPayment: true,
      });
    }

    // CASE 2: Pure Cash payment (PaymentModeID = 1) - Auto verify
    if (paymentModeID === 1) {
      // Cash
      if (receivedAmount < originalAmount) {
        status = "Short";
        shortAmount = originalAmount - receivedAmount;
      }

      // Update record with status
      await pool
        .request()
        .input("paymentId", sql.Int, paymentId)
        .input("status", sql.VarChar, status)
        .input("shortAmount", sql.Decimal(10, 2), shortAmount).query(`
          UPDATE OrderPayments
          SET PaymentVerifyStatus = @status,
              ShortAmount = @shortAmount
          WHERE PaymentID = @paymentId
        `);

      return res.json({
        message: "Cash payment verified successfully",
        paymentId,
        originalAmount,
        receivedAmount,
        status,
        shortAmount,
        autoVerified: true,
        modeName: "Cash",
      });
    }

    // CASE 3: Any other payment mode (GPay, Paytm, Bank Transfer, FOC) - Manual verification
    else {
      return res.json({
        message: `${modeName} payment detected. Manual verification required.`,
        paymentId,
        requiresManualVerification: true,
        modeName,
        paymentModeID,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.markPaymentVerified = async (req, res) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    return res.status(400).json({ message: "PaymentID required" });
  }

  try {
    const pool = await poolPromise;

    // Get the payment details with mode information
    const payment = await pool.request().input("paymentId", sql.Int, paymentId)
      .query(`
        SELECT 
          op.Amount, 
          op.PaymentSummary,
          op.PaymentModeID,
          pm.ModeName
        FROM OrderPayments op
        JOIN PaymentModes pm ON op.PaymentModeID = pm.PaymentModeID
        WHERE op.PaymentID = @paymentId
      `);

    if (payment.recordset.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const originalAmount = payment.recordset[0].Amount;
    const paymentSummary = payment.recordset[0].PaymentSummary;
    const modeName = payment.recordset[0].ModeName;

    // Parse payment summary to get total received amount
    let totalReceived = 0;

    if (paymentSummary && paymentSummary !== "No Payment") {
      // Handle split payments
      const payments = paymentSummary.split("|");
      payments.forEach((p) => {
        // Extract amount from format like "Cash: 100" or "GPay: 200"
        const match = p.match(/:?\s*([\d,]+)/);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ""));
          if (!isNaN(amount)) {
            totalReceived += amount;
          }
        }
      });
    } else {
      // For single payment without summary, use the Amount
      totalReceived = originalAmount;
    }

    // Calculate short amount
    let shortAmount = 0;
    if (totalReceived < originalAmount) {
      shortAmount = originalAmount - totalReceived;
    }

    // Update the payment with verification
    await pool
      .request()
      .input("paymentId", sql.Int, paymentId)
      .input("shortAmount", sql.Decimal(10, 2), shortAmount).query(`
        UPDATE OrderPayments
        SET PaymentVerifyStatus = 'Verified',
            ShortAmount = @shortAmount
        WHERE PaymentID = @paymentId
      `);

    res.json({
      message: `Payment marked as Verified for ${modeName}`,
      shortAmount: shortAmount,
      totalReceived,
      originalAmount,
      modeName,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
exports.markPaymentVerified = async (req, res) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    return res.status(400).json({ message: "PaymentID required" });
  }

  try {
    const pool = await poolPromise;

    // Get the payment details first
    const payment = await pool.request().input("paymentId", sql.Int, paymentId)
      .query(`
        SELECT Amount, PaymentSummary, PaymentMode
        FROM OrderPayments 
        WHERE PaymentID = @paymentId
      `);

    if (payment.recordset.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const originalAmount = payment.recordset[0].Amount;
    const paymentSummary = payment.recordset[0].PaymentSummary;
    const paymentMode = payment.recordset[0].PaymentMode;

    // Parse payment summary to get total received amount
    let totalReceived = 0;
    if (paymentSummary) {
      const payments = paymentSummary.split("|");
      payments.forEach((p) => {
        const amount = parseFloat(p.split(":")[1]);
        if (!isNaN(amount)) {
          totalReceived += amount;
        }
      });
    }

    // For single payment mode without split, use the Amount
    if (totalReceived === 0) {
      totalReceived = originalAmount;
    }

    let shortAmount = 0;
    if (totalReceived < originalAmount) {
      shortAmount = originalAmount - totalReceived;
    }

    // Update the payment with verification
    await pool
      .request()
      .input("paymentId", sql.Int, paymentId)
      .input("shortAmount", sql.Decimal(10, 2), shortAmount).query(`
        UPDATE OrderPayments
        SET PaymentVerifyStatus = 'Verified',
            ShortAmount = @shortAmount
        WHERE PaymentID = @paymentId
      `);

    res.json({
      message: `Payment marked as Verified for ${paymentMode}`,
      shortAmount: shortAmount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.handoverCash = async (req, res) => {
  const {
    deliveryManId,
    totalHandoverAmount,
    denominationJSON,
    orderPaymentIds,
  } = req.body;

  console.log("Handover payload:", req.body); // 🔹 payload check

  if (!deliveryManId || !totalHandoverAmount) {
    console.log("Missing deliveryManId or totalHandoverAmount");
    return res
      .status(400)
      .json({ message: "DeliveryManID and Amount required!" });
  }

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    console.log("Transaction started");

    // 1️⃣ Get current balance
    const balanceResult = await new sql.Request(transaction).input(
      "DeliveryManID",
      sql.Int,
      deliveryManId,
    ).query(`
        SELECT CurrentBalance 
        FROM DeliveryMenCashBalance 
        WHERE DeliveryManID = @DeliveryManID
      `);

    if (balanceResult.recordset.length === 0) {
      throw new Error("Delivery man balance record not found");
    }

    const currentBalance = balanceResult.recordset[0].CurrentBalance;
    console.log("Current balance:", currentBalance);

    // Check sufficient balance
    if (currentBalance < totalHandoverAmount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // 🔹 Handle empty orderPaymentIds safely
    if (!orderPaymentIds || orderPaymentIds.length === 0) {
      console.log("No orders to handover");
      await transaction.commit();
      return res.status(200).json({
        message: "Nothing to handover",
        updatedBalance: currentBalance,
      });
    }

    // 2️⃣ Subtract balance
    await new sql.Request(transaction)
      .input("DeliveryManID", sql.Int, deliveryManId)
      .input("Amount", sql.Decimal(10, 2), totalHandoverAmount).query(`
        UPDATE DeliveryMenCashBalance
        SET CurrentBalance = CurrentBalance - @Amount
        WHERE DeliveryManID = @DeliveryManID
      `);
    console.log("Balance updated");

    // 3️⃣ Insert into CashDepartment
    await new sql.Request(transaction)
      .input("DeliveryManID", sql.Int, deliveryManId)
      .input("Amount", sql.Decimal(10, 2), totalHandoverAmount)
      .input(
        "DenominationJSON",
        sql.NVarChar(sql.MAX),
        JSON.stringify(denominationJSON),
      ).query(`
        INSERT INTO CashDepartment 
        (DeliveryManId, TotalHandoverAmount, DenominationJSON, CreatedAt)
        VALUES (@DeliveryManID, @Amount, @DenominationJSON, GETDATE())
      `);
    console.log("Inserted into CashDepartment");

    // 4️⃣ Validate & mark payments
    const paymentCheck = await new sql.Request(transaction)
      .input("DeliveryManID", sql.Int, deliveryManId)
      .input("IDs", sql.VarChar, orderPaymentIds.join(",")).query(`
        SELECT SUM(OP.Amount) AS TotalCash
        FROM OrderPayments OP
        JOIN AssignedOrders A ON OP.AssignID = A.AssignID
        WHERE 
          OP.IsHandovered = 0
          AND A.DeliveryManID = @DeliveryManID
          AND OP.PaymentID IN (SELECT value FROM STRING_SPLIT(@IDs, ','))
      `);

    const calculatedAmount = paymentCheck.recordset[0].TotalCash || 0;
    console.log("Calculated order amount:", calculatedAmount);

    if (calculatedAmount !== totalHandoverAmount) {
      throw new Error(
        `Handover amount mismatch. Selected orders total ₹${calculatedAmount}`,
      );
    }

    await new sql.Request(transaction).input(
      "IDs",
      sql.VarChar,
      orderPaymentIds.join(","),
    ).query(`
        UPDATE OrderPayments
        SET IsHandovered = 1
        WHERE PaymentID IN (SELECT value FROM STRING_SPLIT(@IDs, ','))
      `);
    console.log("OrderPayments marked as handed over");

    // 5️⃣ Insert history
    await new sql.Request(transaction)
      .input("DeliveryManID", sql.Int, deliveryManId)
      .input("Amount", sql.Decimal(10, 2), totalHandoverAmount)
      .input("Type", sql.VarChar, "DEBIT").query(`
        INSERT INTO CashHandoverHistory
        (DeliveryManID, Amount, TransactionType, EntryDate)
        VALUES (@DeliveryManID, @Amount, @Type, GETDATE())
      `);
    console.log("History inserted");

    // 6️⃣ Fetch updated balance
    const updatedBalanceResult = await new sql.Request(transaction).input(
      "DeliveryManID",
      sql.Int,
      deliveryManId,
    ).query(`
        SELECT CurrentBalance 
        FROM DeliveryMenCashBalance 
        WHERE DeliveryManID = @DeliveryManID
      `);

    const updatedBalance = updatedBalanceResult.recordset[0].CurrentBalance;
    await transaction.commit();
    console.log("Transaction committed, updated balance:", updatedBalance);

    res.status(200).json({
      message: "Cash Handover Successful!",
      updatedBalance,
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Handover failed:", err.message);
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
