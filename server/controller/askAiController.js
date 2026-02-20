const { sql, poolPromise } = require("../utils/db");
const Groq = require("groq-sdk");

exports.askAi = async (req, res) => {
  try {
    const { question } = req.body;

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    if (!question)
      return res.status(400).json({ message: "Sawal toh puchiye!" });

    const systemPrompt = `
      You are the Lead Data Analyst for 'The Hens Co.' ERP. 
      Generate a valid T-SQL query for SQL Server based on the schema below.

      SCHEMA RULES:
      1. **Delivery Boys & Cash**: 
         - To get names with balance, JOIN [DeliveryMenCashBalance] (DMCB) with [DeliveryMen] (DM) on DeliveryManID.
         - For Current Cash: Use DMCB.CurrentBalance.
         - For Handover History: Use [CashDepartment] or [CashHandoverHistory].
      2. **Orders & Sales**:
         - Header info is in [OrdersTemp]. Line items (items, qty, rate, total) are in [OrderItems]. Join on OrderID.
         - Today's Sales: Sum(Total) from [OrderItems] joined with [OrdersTemp] where OrderDate = CAST(GETDATE() AS DATE).
      3. **Assignments**:
         - Use [AssignedOrders] to see which boy ([DeliveryManID]) delivered which order ([OrderID]).
      4. **Payments**:
         - Use [OrderPayments] for collection info and [paymentmodes] for mode names (Cash, GPay, etc.).
      5. **Stock**:
         - Current Stock: Use [Stock] table.
         - Rejected Stock: Use [RejectedStock] table.

      TABLE LIST:
      - Area (areaId, areaName)
      - DeliveryMen (DeliveryManID, Name, MobileNo)
      - DeliveryMenCashBalance (DeliveryManID, CurrentBalance)
      - OrdersTemp (OrderID, CustomerName, OrderDate, InvoiceNo, Area)
      - OrderItems (ItemID, OrderID, ProductName, Quantity, Total)
      - Stock (item_name, quantity, weight)
      - AssignedOrders (OrderID, DeliveryManID, DeliveryStatus, DeliveryDate)
      - CashDepartment (DeliveryManId, TotalHandoverAmount, CreatedAt)

      RULES:
      - Return ONLY raw T-SQL code. No markdown (\`\`\`), no explanations.
      - Use INNER JOINs to provide Names instead of just IDs.
      - Use SELECT only.

      QUESTION: ${question}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: systemPrompt }],
      model: "llama-3.3-70b-versatile",
    });

    let sqlQuery = chatCompletion.choices[0].message.content.trim();
    sqlQuery = sqlQuery.replace(/```sql|```/g, "").trim();

    const pool = await poolPromise;
    const dbResult = await pool.request().query(sqlQuery);

    res.json({
      success: true,
      answer: dbResult.recordset,
      queryUsed: sqlQuery,
    });
  } catch (err) {
    console.error("Groq/DB Error:", err);
    res.status(500).json({ message: "Error: " + err.message });
  }
};
