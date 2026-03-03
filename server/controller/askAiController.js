const { sql, poolPromise } = require("../utils/db");
const Groq = require("groq-sdk");

const cache = new Map(); // simple memory cache

exports.askAi = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim() === "") {
      return res.status(400).json({ message: "Sawal toh puchiye!" });
    }

    // ✅ Cache check
    if (cache.has(question)) {
      return res.json({
        success: true,
        cached: true,
        ...cache.get(question),
      });
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const systemPrompt = `
You are the Chief Business Intelligence Analyst of 'The Hens Co.' ERP.
Generate ONLY valid Microsoft SQL Server SELECT queries.

IMPORTANT:
- Always use TOP 100 unless specifically asked otherwise.
- Always use CAST(O.OrderDate AS DATE)
- Default year = 2026
- Return raw SQL only.

Tables:
OrdersTemp O (OrderID, CustomerName, Address, Area, ContactNo, DeliveryCharge, OrderDate, OrderTakenBy, InvoiceNo, Po_No, Po_Date, InvoiceDate)
OrderItems OI (ItemID, OrderID, ProductName, ProductType, Weight, Quantity, Rate, Total)
AssignedOrders AO (AssignID, OrderID, DeliveryManID, DeliveryDate, DeliveryStatus, ActualDeliveryDate, PaymentReceivedDate)
DeliveryMen DM (DeliveryManID, Name, Area, MobileNo, IsActive)
OrderPayments OP (PaymentID, OrderID, AssignID, PaymentModeID, Amount, PaymentReceivedDate, IsHandovered, PaymentVerifyStatus, ShortAmount)
Stock (id, item_name, quantity, weight, created_at)
Customers (CustomerId, CustomerName, Area, Credit_Limit)
DeliveryMenCashBalance (DeliveryManID, CurrentBalance)
ProductTypes (ProductType)

Special Queries:

1) If user asks:
"kis delivery boy ke pass sabse jyada cash hai"

SELECT TOP 1
dm.CurrentBalance,
d.Name
FROM DeliveryMenCashBalance dm
INNER JOIN DeliveryMen d 
ON dm.DeliveryManID = d.DeliveryManID
ORDER BY dm.CurrentBalance DESC

2) If user asks:
"abhi kitna stock hai"

SELECT TOP 100
pt.ProductType as ProductName, 
SUM(CAST(s.quantity AS INT)) as CurrentStock,
CASE 
WHEN SUM(CAST(s.quantity AS INT)) <= 0 THEN 'Out Of Stock'
WHEN SUM(CAST(s.quantity AS INT)) <= 5 THEN 'Low Stock'
WHEN SUM(CAST(s.quantity AS INT)) > 20 THEN 'High Stock'
ELSE 'Medium Stock'
END as Status
FROM ProductTypes pt
LEFT JOIN Stock s 
ON pt.ProductType = s.item_name
GROUP BY pt.ProductType

STRICT:
- Only SELECT
- No INSERT, UPDATE, DELETE, DROP
`;

    // 🧠 AI Call
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "user", content: systemPrompt + "\nQUESTION:\n" + question },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      max_tokens: 1000,
    });

    let sqlQuery = completion.choices[0].message.content
      .replace(/```sql|```|`/gi, "")
      .replace(/;/g, "")
      .trim();

    // ✅ Force TOP 100 if missing
    if (/^select\s/i.test(sqlQuery) && !/top\s+\d+/i.test(sqlQuery)) {
      sqlQuery = sqlQuery.replace(/^select/i, "SELECT TOP 100");
    }

    if (!/^select\s/i.test(sqlQuery)) {
      return res
        .status(400)
        .json({ success: false, message: "Only SELECT allowed." });
    }

    const forbidden = [
      "insert",
      "update",
      "delete",
      "drop",
      "alter",
      "truncate",
    ];
    if (forbidden.some((word) => sqlQuery.toLowerCase().includes(word))) {
      return res
        .status(400)
        .json({ success: false, message: "Dangerous query blocked." });
    }

    const pool = await poolPromise;

    // ⏱ Query timeout 5 seconds
    const request = pool.request();
    request.timeout = 5000;

    // 🧠 SQL Validation + Auto Retry
    try {
      await request.query(
        "SET PARSEONLY ON; " + sqlQuery + "; SET PARSEONLY OFF;",
      );
    } catch (err) {
      // retry once
      const retry = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: systemPrompt + "\nFix SQL error. QUESTION:\n" + question,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0,
      });

      sqlQuery = retry.choices[0].message.content
        .replace(/```sql|```|`/gi, "")
        .replace(/;/g, "")
        .trim();
    }

    // 🚀 Execute
    const result = await request.query(sqlQuery);

    const responseData = {
      success: true,
      queryUsed: sqlQuery,
      rowCount: result.recordset.length,
      answer: result.recordset,
    };

    // ✅ Save in cache
    cache.set(question, responseData);

    res.json(responseData);
  } catch (err) {
    console.error("AI/DB Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
