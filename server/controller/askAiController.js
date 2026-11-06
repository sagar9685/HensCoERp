const { GoogleGenAI } = require("@google/genai");

const reportBridge = require("../services/reportBridge");
const aiDb = require("../services/aiReadOnlyDb");

// ======================================================
// CONFIGURATION
// ======================================================

let geminiClient = null;

const GEMINI_TIMEOUT = Math.min(
  20000,
  Math.max(3000, Number(process.env.GEMINI_TIMEOUT_MS) || 9000),
);

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const MONTH_PATTERN = MONTHS.join("|");

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  return geminiClient;
}

function getModels() {
  const primary = process.env.GEMINI_MODEL || "gemini-flash-latest";

  const fallback = (process.env.GEMINI_FALLBACK_MODELS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  return [...new Set([primary, ...fallback])].slice(0, 3);
}

// ======================================================
// DATE HELPERS - INDIA TIMEZONE
// ======================================================

function today() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function validDate(year, month, day) {
  const value =
    `${year}-${String(month).padStart(2, "0")}-` + String(day).padStart(2, "0");

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? value
    : null;
}

function getRequestedDate(question) {
  const q = question.toLowerCase();

  // YYYY-MM-DD
  const iso = q.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);

  if (iso) {
    return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const indian = q.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);

  if (indian) {
    return validDate(Number(indian[3]), Number(indian[2]), Number(indian[1]));
  }

  // 23 October 2026
  const named = q.match(
    new RegExp(
      `\\b(\\d{1,2})\\s+(${MONTH_PATTERN})` + `(?:\\s+(20\\d{2}))?\\b`,
      "i",
    ),
  );

  if (named) {
    const month = MONTHS.indexOf(named[2].toLowerCase()) + 1;

    return validDate(
      Number(named[3] || today().slice(0, 4)),
      month,
      Number(named[1]),
    );
  }

  if (/\b(yesterday|kal)\b|कल/i.test(q)) {
    return shiftDate(today(), -1);
  }

  if (/\b(today|aaj|aj)\b|आज/i.test(q)) {
    return today();
  }

  return null;
}

function getRequestedMonths(question) {
  const q = question.toLowerCase();
  const result = [];

  const defaultYear = Number(
    q.match(/\b20\d{2}\b/)?.[0] || today().slice(0, 4),
  );

  // Named months
  MONTHS.forEach((name, index) => {
    const regex = new RegExp(`\\b${name}(?:\\s+(20\\d{2}))?\\b`, "gi");

    for (const match of q.matchAll(regex)) {
      result.push({
        year: Number(match[1] || defaultYear),
        month: index + 1,
      });
    }
  });

  // YYYY-MM
  const numeric = q.matchAll(/\b(20\d{2})[-/](0?[1-9]|1[0-2])\b/g);

  for (const match of numeric) {
    result.push({
      year: Number(match[1]),
      month: Number(match[2]),
    });
  }

  return result.filter(
    (item, index, array) =>
      index ===
      array.findIndex(
        (other) => other.year === item.year && other.month === item.month,
      ),
  );
}

function getCurrentMonth() {
  const date = today();

  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
  };
}

// ======================================================
// QUESTION DETECTION
// ======================================================

function isComparisonQuestion(q) {
  return /\b(compare|comparison|difference|versus|vs|growth|increase|decrease|tulana|muqable)\b|तुलना/i.test(
    q,
  );
}

function isFinancialQuestion(q) {
  return /\b(sale|sales|revenue|collection|received|outstanding|gross|net sales|bikri|bakaya|turnover)\b|बिक्री|बकाया/i.test(
    q,
  );
}

function isSpecificQuestion(q) {
  return /\b(customer|client|party|zomato|hyperpure|delivery boy|delivery man|area|product|tray|box|chicken|egg|invoice|order id|order number|pending verification|unverified|short payment)\b|ग्राहक/i.test(
    q,
  );
}

function isTodayOrdersQuestion(q) {
  const question = q.toLowerCase();

  const dateWords = /\b(today|aaj|aj)\b|आज/.test(question);

  const orderWords = /\b(order|orders)\b|ऑर्डर/.test(question);

  const countWords = /\b(how many|total|count|number|kitne)\b|कितने|कुल/.test(
    question,
  );

  const restricted =
    /\b(customer|client|area|product|delivery boy|delivery man|payment|invoice|assigned|pending|cancelled|canceled|complete|completed)\b/i.test(
      question,
    );

  return dateWords && orderWords && countWords && !restricted;
}

function isPendingVerification(q) {
  return (
    /\b(pending|unverified|verification|verify)\b/i.test(q) &&
    /\b(payment|payments|gpay|paytm|cash|amount|order|orders|verification)\b/i.test(
      q,
    )
  );
}

function isEggSalesQuestion(q) {
  return (
    /\b(egg|eggs|anda|ande)\b|अंडे/i.test(q) &&
    /\b(sold|sell|sale|sales|kitne|quantity|qty|total|bikri|bike)\b|बिके|बिक्री/i.test(
      q,
    )
  );
}

function isMyAssignedOrderQuestion(q) {
  return (
    /\b(my|mera|meri|mere)\b/i.test(q) &&
    /\b(assigned|assignment|order)\b/i.test(q) &&
    /\b(complete|completed|status|delivered|hua|ho gaya)\b/i.test(q)
  );
}

function isOverallMonthlyQuestion(q, periods) {
  if (periods.length !== 1) return false;
  if (!isFinancialQuestion(q)) return false;
  if (isComparisonQuestion(q)) return false;
  if (isSpecificQuestion(q)) return false;
  if (getRequestedDate(q)) return false;

  return true;
}

function detectCustomerOutstanding(q) {
  const text = q.trim();

  if (!/\b(outstanding|balance|bakaya|udhari|dues)\b|बकाया/i.test(text)) {
    return null;
  }

  if (
    /\b(top|highest|maximum|all|every|which|who|kis|kaun|customer wise|customer-wise|area wise|area-wise|total outstanding)\b/i.test(
      text,
    )
  ) {
    return null;
  }

  const patterns = [
    // Akash Lalwani ki outstanding batao
    /^(.+?)\s+(?:ki|ka|ke)\s+(?:total\s+)?(?:outstanding|balance|bakaya|udhari|dues)\b/i,

    // Outstanding of Akash Lalwani
    /\b(?:outstanding|balance|dues)\s+(?:of|for)\s+(.+?)(?:\?|$)/i,

    // Show Akash Lalwani outstanding
    /^(?:show|tell|give)\s+(?:me\s+)?(.+?)\s+(?:outstanding|balance|dues)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) continue;

    const customer = match[1]
      .replace(/^(?:customer|client|party)\s+/i, "")
      .replace(/\s+(?:batao|btao|batana|please|dikhao)$/i, "")
      .trim();

    if (
      customer.length >= 3 &&
      customer.length <= 120 &&
      !/\b(today|yesterday|month|november|october)\b/i.test(customer)
    ) {
      return customer;
    }
  }

  return null;
}

// ======================================================
// RESPONSE HELPERS
// ======================================================

function numeric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function respond(res, started, payload) {
  const data = Array.isArray(payload.data) ? payload.data : [];

  return res.status(200).json({
    success: true,
    mode: "database",
    message: payload.message || "",
    data,
    rowCount: payload.rowCount ?? data.length,
    queryUsed: payload.queryUsed || null,
    source: payload.source || "HensCo ERP",
    ...(payload.summary != null ? { summary: payload.summary } : {}),
    durationMs: Date.now() - started,
  });
}

function clarify(res, started, message) {
  return res.status(200).json({
    success: true,
    mode: "chat",
    message,
    data: [],
    rowCount: 0,
    queryUsed: null,
    durationMs: Date.now() - started,
  });
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (x) =>
        x &&
        ["user", "assistant"].includes(x.role) &&
        typeof x.content === "string",
    )
    .slice(-6)
    .map((x) => ({
      role: x.role,
      content: x.content.slice(0, 500),
    }));
}

function describeRows(rows) {
  if (!rows.length) {
    return "No matching ERP records were found.";
  }

  if (rows.length === 1) {
    return Object.entries(rows[0])
      .map(
        ([key, value]) =>
          `${key}: ${
            value === null || value === undefined
              ? "Not available"
              : typeof value === "number"
                ? value.toLocaleString("en-IN")
                : String(value)
          }`,
      )
      .join("\n");
  }

  return `${rows.length} matching ERP records found. See the table below.`;
}

function extractErrorStatus(error) {
  const direct = Number(error.status || error.code);

  if (Number.isFinite(direct)) return direct;

  try {
    return Number(JSON.parse(error.message)?.error?.code) || 0;
  } catch {
    return 0;
  }
}

// ======================================================
// GEMINI FALLBACK
// ======================================================

async function geminiJson(prompt) {
  const models = getModels();

  let lastError;

  for (const modelName of models) {
    const started = Date.now();

    try {
      console.log(`[AI] Trying Gemini: ${modelName}`);

      const result = await getClient().models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 1200,
          automaticContinuation: false,
          httpOptions: {
            timeout: GEMINI_TIMEOUT,
          },
        },
      });

      const raw = result.text?.trim();

      if (!raw) {
        throw new Error("Gemini returned empty response");
      }

      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      const plan = JSON.parse(cleaned);

      if (
        !plan ||
        typeof plan !== "object" ||
        !["monthly", "customer_outstanding", "query", "unsupported"].includes(
          plan.tool,
        )
      ) {
        throw new Error("Invalid Gemini query plan");
      }

      console.log(
        `[AI] Gemini ${modelName} completed in ${Date.now() - started}ms`,
      );

      return plan;
    } catch (error) {
      lastError = error;

      const status = extractErrorStatus(error);

      const isTimeout = /timeout|timed out|deadline|abort/i.test(
        `${error.name} ${error.message}`,
      );

      console.warn(
        `[AI] Gemini ${modelName} failed`,
        status || error.name,
        `after ${Date.now() - started}ms`,
      );

      // Only retry another model for temporary failures.
      if (![404, 429, 500, 502, 503, 504].includes(status) && !isTimeout) {
        throw error;
      }
    }
  }

  throw lastError || new Error("All configured AI models unavailable");
}

// ======================================================
// APPROVED REPORTING VIEW GUIDE
// ======================================================

const VIEW_GUIDE = `
You can query ONLY these SQL Server reporting views.

dbo.AI_Orders:
OrderID, CustomerName, Area, OrderDate,
DeliveryCharge, DeliveryStatus, InvoiceNo

dbo.AI_OrderItems:
OrderID, ProductType, Weight, Quantity, Rate, Total

dbo.AI_Payments:
OrderID, PaymentModeID, ModeName, IsRevenue,
Amount, PaymentVerifyStatus, ShortAmount,
PaymentReceivedDate

dbo.AI_Customers:
CustomerId, CustomerName, Area, Credit_Limit

dbo.AI_DeliveryCash:
DeliveryManID, Name, CurrentBalance

dbo.AI_Stock:
item_name, weight, quantity

dbo.AI_CreditNotes:
order_id, note_type, amount, freight,
note_date, status

Relationships:
AI_Orders.OrderID = AI_OrderItems.OrderID
AI_Orders.OrderID = AI_Payments.OrderID
AI_Orders.OrderID = AI_CreditNotes.order_id

Rules:
- Microsoft SQL Server syntax only.
- Generate exactly one SELECT TOP (100) query.
- Never generate INSERT, UPDATE, DELETE, DROP,
  ALTER, EXEC or stored procedures.
- Use only approved reporting views.
- Never invent table or column names.
- Avoid multiplying totals across 1-to-many joins.
- Exclude cancelled orders where relevant.
- For exact monthly financials use monthly tool.
- For customer financials use customer_outstanding.
- Pending verification is not the same as debt.
- Stock records may not represent closing stock.
- Use OrderDate for orders, PaymentReceivedDate
  for receipt dates.
- Do not invent financial results.
`;

// ======================================================
// DIRECT SQL - TODAY'S ORDERS
// ======================================================

async function getTodayOrders() {
  const date = today();

  const query = `
SELECT TOP (100)
  COUNT(DISTINCT OrderID) AS TotalOrdersToday
FROM dbo.AI_Orders
WHERE OrderDate >= '${date}'
  AND OrderDate < DATEADD(
    DAY, 1, CAST('${date}' AS DATE)
  )
  AND ISNULL(DeliveryStatus, '') <> 'Cancel'
  `.trim();

  const result = await aiDb.execute(query);

  const rows = result.data || [];
  const total = numeric(rows[0]?.TotalOrdersToday);

  return {
    message:
      `Today (${date}), there are ` +
      `${total.toLocaleString("en-IN")} active orders ` +
      `(excluding cancelled orders).`,
    data: rows,
    queryUsed: result.queryUsed,
    source: "AI_Orders",
  };
}

// ======================================================
// MONTHLY REPORT
// ======================================================

async function runMonthly(year, month, user) {
  const result = await reportBridge.monthly(year, month, user);

  return {
    message: result.message,
    data: result.data || [],
    rowCount: result.data?.length || 0,
    source: result.source || "Monthly Report",
  };
}

// ======================================================
// MONTHLY COMPARISON
// ======================================================

function readMetric(row, aliases) {
  for (const alias of aliases) {
    const key = Object.keys(row).find(
      (k) => k.toLowerCase() === alias.toLowerCase(),
    );

    if (key && row[key] !== null && row[key] !== undefined) {
      const value = Number(row[key]);
      if (Number.isFinite(value)) return value;
    }
  }

  return null;
}

function readMonthlyMetrics(row) {
  return {
    Orders: readMetric(row, ["Orders", "TotalOrders"]),
    GrossSales: readMetric(row, ["GrossSales", "TotalGrossSales"]),
    NetSales: readMetric(row, ["NetSales", "TotalNetSales"]),
    Received: readMetric(row, [
      "Received",
      "TotalReceived",
      "PaymentCollected",
    ]),
    Outstanding: readMetric(row, ["Outstanding", "TotalOutstanding"]),
  };
}

async function compareMonths(periods, user) {
  const [first, second] = periods;

  const [reportA, reportB] = await Promise.all([
    reportBridge.monthly(first.year, first.month, user),
    reportBridge.monthly(second.year, second.month, user),
  ]);

  const a = reportA.data?.[0];
  const b = reportB.data?.[0];

  if (!a || !b) {
    return {
      message: "One or both monthly reports are unavailable.",
      data: [],
    };
  }

  const metricsA = readMonthlyMetrics(a);
  const metricsB = readMonthlyMetrics(b);

  if (metricsA.NetSales === null || metricsB.NetSales === null) {
    throw new Error(
      "Monthly reports are missing NetSales. " +
        "Check reportBridge.monthly() field mapping.",
    );
  }

  const labelA = `${first.year}-${String(first.month).padStart(2, "0")}`;

  const labelB = `${second.year}-${String(second.month).padStart(2, "0")}`;

  const difference = metricsB.NetSales - metricsA.NetSales;

  const growth =
    metricsA.NetSales === 0 ? null : (difference / metricsA.NetSales) * 100;

  return {
    message:
      `${labelA} vs ${labelB}\n\n` +
      `${labelA} Net Sales: ${money.format(metricsA.NetSales)}\n` +
      `${labelB} Net Sales: ${money.format(metricsB.NetSales)}\n` +
      `Difference: ${money.format(difference)}\n` +
      `Growth: ${
        growth === null
          ? "Not available (base sales are zero)"
          : `${growth.toFixed(2)}%`
      }`,
    data: [
      { Month: labelA, ...metricsA },
      { Month: labelB, ...metricsB },
    ],
    source: "Monthly ERP Reports",
  };
}

// ======================================================
// CUSTOMER OUTSTANDING - NO GEMINI
// ======================================================

async function customerOutstanding(customerName, user) {
  const result = await reportBridge.customerOutstanding(
    {
      customerName,
      from: undefined,
      to: undefined,
      area: "",
    },
    user,
  );

  const rows = Array.isArray(result.data) ? result.data : [];

  return {
    message:
      result.message ||
      (rows.length
        ? `Customer financial results for ${customerName}`
        : `No matching customer records found for ${customerName}.`),
    data: rows,
    rowCount: result.rowCount ?? rows.length,
    summary: result.totals,
    source: result.source || "Customer Outstanding Report",
  };
}

// ======================================================
// PENDING VERIFICATION
// ======================================================

async function pendingVerification(question) {
  const date = getRequestedDate(question);

  if (!date) {
    return {
      clarification: true,
      message:
        "Please specify the order date, " + "for example: 23 October 2026.",
    };
  }

  const query = `
SELECT TOP (100)
  P.OrderID,
  O.CustomerName,
  P.ModeName,
  P.Amount AS PendingAmount,
  P.PaymentVerifyStatus,
  O.OrderDate
FROM dbo.AI_Payments P
INNER JOIN dbo.AI_Orders O
  ON O.OrderID = P.OrderID
WHERE O.OrderDate >= '${date}'
  AND O.OrderDate < DATEADD(
    DAY, 1, CAST('${date}' AS DATE)
  )
  AND P.PaymentVerifyStatus = 'Pending'
  AND ISNULL(O.DeliveryStatus, '') <> 'Cancel'
ORDER BY P.Amount DESC
  `.trim();

  const result = await aiDb.execute(query);
  const rows = result.data || [];

  const total = rows.reduce((sum, row) => sum + numeric(row.PendingAmount), 0);

  return {
    message:
      `${date}: ${rows.length} pending verification records.\n` +
      `Total displayed pending amount: ${money.format(total)}.\n` +
      `Pending verification is not necessarily unpaid debt.`,
    data: rows,
    queryUsed: result.queryUsed,
    source: "AI_Payments + AI_Orders",
  };
}

// ======================================================
// EGG SALES
// ======================================================

async function eggSales(question) {
  const date = getRequestedDate(question);

  if (!date) {
    return {
      clarification: true,
      message: "Please specify a date for egg sales.",
    };
  }

  const query = `
SELECT TOP (100)
  COUNT(DISTINCT O.OrderID) AS MatchingOrders,
  COUNT(I.OrderID) AS MatchingItemRows,
  ISNULL(SUM(
    CASE
      WHEN I.ProductType = 'Tray'
        THEN ISNULL(I.Quantity, 0) * 30
      WHEN I.ProductType = 'Box'
        THEN ISNULL(I.Quantity, 0) * 6
      WHEN I.ProductType IN (
        'Box (Kids)', 'Box (Women)'
      )
        THEN ISNULL(I.Quantity, 0) * 10
      ELSE 0
    END
  ), 0) AS TotalEggsSold
FROM dbo.AI_Orders O
INNER JOIN dbo.AI_OrderItems I
  ON O.OrderID = I.OrderID
WHERE O.OrderDate >= '${date}'
  AND O.OrderDate < DATEADD(
    DAY, 1, CAST('${date}' AS DATE)
  )
  AND ISNULL(O.DeliveryStatus, '') <> 'Cancel'
  AND I.ProductType IN (
    'Tray', 'Box', 'Box (Kids)', 'Box (Women)'
  )
  `.trim();

  const result = await aiDb.execute(query);

  const rows = result.data || [];
  const row = rows[0];

  const eggs = numeric(row?.TotalEggsSold);
  const matchingItems = numeric(row?.MatchingItemRows);

  return {
    message:
      matchingItems > 0
        ? `${date}: ${eggs.toLocaleString("en-IN")} eggs recorded in orders.`
        : `No matching egg order items found for ${date}.`,
    data: rows,
    queryUsed: result.queryUsed,
    source: "AI_Orders + AI_OrderItems",
  };
}

// ======================================================
// DYNAMIC QUERY
// ======================================================

async function runDynamicQuery(query) {
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("AI returned an invalid SQL query");
  }

  // aiReadOnlyDb.execute must validate the SQL,
  // enforce read-only views, and limit execution time.
  const result = await aiDb.execute(query);

  const rows = result.data || [];

  return {
    message: describeRows(rows),
    data: rows,
    queryUsed: result.queryUsed,
    source: "Approved SQL Reporting Views",
  };
}

// ======================================================
// MAIN CONTROLLER
// ======================================================

exports.askAi = async (req, res) => {
  const started = Date.now();

  try {
    const question = req.body?.question;

    if (
      typeof question !== "string" ||
      !question.trim() ||
      question.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Question must contain 1–2000 characters.",
      });
    }

    // IMPORTANT:
    // JWT middleware must populate req.user.
    // Current views are not area-scoped.
    // Keep reporting admin-only until row-level
    // access control is implemented.
    const role = String(req.user?.role || req.user?.Role || "")
      .trim()
      .toLowerCase();

    if (!["admin", "superadmin", "super admin"].includes(role)) {
      return res.status(req.user ? 403 : 401).json({
        success: false,
        message: req.user
          ? "AI reporting is restricted to administrators."
          : "Authentication required for ERP AI reporting.",
      });
    }

    const q = question.trim();

    const history = normalizeHistory(req.body?.history);

    const periods = getRequestedMonths(q);

    console.log("[AI] Question:", q);

    // =================================================
    // 1. TODAY'S ORDERS - FAST SQL
    // =================================================

    if (isTodayOrdersQuestion(q)) {
      console.log("[AI FAST] Today's orders");

      const result = await getTodayOrders();

      return respond(res, started, result);
    }

    // =================================================
    // 2. MONTHLY COMPARISON
    // =================================================

    if (
      isComparisonQuestion(q) &&
      periods.length === 2 &&
      isFinancialQuestion(q)
    ) {
      console.log("[AI FAST] Monthly comparison");

      const result = await compareMonths(periods, req.user);

      return respond(res, started, result);
    }

    // =================================================
    // 3. PENDING PAYMENT VERIFICATION
    // =================================================

    if (isPendingVerification(q)) {
      console.log("[AI FAST] Pending verification");

      const result = await pendingVerification(q);

      if (result.clarification) {
        return clarify(res, started, result.message);
      }

      return respond(res, started, result);
    }

    // =================================================
    // 4. EGG SALES
    // =================================================

    if (isEggSalesQuestion(q)) {
      console.log("[AI FAST] Egg sales");

      const result = await eggSales(q);

      if (result.clarification) {
        return clarify(res, started, result.message);
      }

      return respond(res, started, result);
    }

    // =================================================
    // 5. CUSTOMER OUTSTANDING
    // =================================================

    const customerName = detectCustomerOutstanding(q);

    if (customerName) {
      console.log("[AI FAST] Customer outstanding:", customerName);

      const result = await customerOutstanding(customerName, req.user);

      return respond(res, started, result);
    }

    // =================================================
    // 6. MY ASSIGNED ORDER
    // =================================================

    if (isMyAssignedOrderQuestion(q) && !/\b\d{4,8}\b/.test(q)) {
      return clarify(
        res,
        started,
        "Please provide an Order ID. " +
          "The current reporting views cannot identify " +
          "your assigned orders automatically.",
      );
    }

    // =================================================
    // 7. MONTHLY FINANCIAL REPORT
    // =================================================

    if (isOverallMonthlyQuestion(q, periods)) {
      const period = periods[0];

      console.log("[AI FAST] Monthly report:", period);

      const result = await runMonthly(period.year, period.month, req.user);

      return respond(res, started, result);
    }

    // =================================================
    // 8. GEMINI DYNAMIC PLANNER
    // =================================================

    const prompt = `
You are HensCo Intelligence, an ERP database analyst.

Today in India: ${today()}.

User question:
${q}

Previous conversation:
${JSON.stringify(history)}

Select ONE tool. Return JSON only.

1. Monthly overall financial report:
{"tool":"monthly","year":2026,"month":11}

2. Customer financial report:
{"tool":"customer_outstanding",
 "customerName":"actual customer name",
 "from":"",
 "to":"",
 "area":""}

3. SQL reporting:
{"tool":"query","sql":"SELECT TOP (100) ..."}

4. Clarification or unsupported:
{"tool":"unsupported","message":"reason"}

Important:
- Every question concerns the ERP database.
- Never invent facts or financial totals.
- Monthly sales and outstanding use monthly tool.
- Customer outstanding uses customer_outstanding.
- Other ERP facts use query.
- If exact identity is missing, ask for clarification.
- Do not change existing financial formulas.
- Do not generate raw-table queries.
- Use only approved SQL reporting views.
- Avoid duplicate sums from one-to-many joins.
- Do not use write queries.
- Maintain the requested date and period.

${VIEW_GUIDE}
    `.trim();

    const plan = await geminiJson(prompt);

    // =================================================
    // 9. GEMINI -> MONTHLY
    // =================================================

    if (plan.tool === "monthly") {
      const year = Number(plan.year);
      const month = Number(plan.month);

      if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        year < 2020 ||
        year > 2100 ||
        month < 1 ||
        month > 12
      ) {
        throw new Error("Invalid monthly report period");
      }

      const result = await runMonthly(year, month, req.user);

      return respond(res, started, result);
    }

    // =================================================
    // 10. GEMINI -> CUSTOMER OUTSTANDING
    // =================================================

    if (plan.tool === "customer_outstanding") {
      const filters = {
        customerName: String(plan.customerName || "").slice(0, 120),
        from: plan.from || undefined,
        to: plan.to || undefined,
        area: String(plan.area || "").slice(0, 100),
      };

      if (
        !filters.customerName &&
        !filters.area &&
        !filters.from &&
        !filters.to
      ) {
        return clarify(
          res,
          started,
          "Please specify a customer, area, or date range.",
        );
      }

      const result = await reportBridge.customerOutstanding(filters, req.user);

      return respond(res, started, {
        message: result.message,
        data: result.data || [],
        rowCount: result.rowCount,
        summary: result.totals,
        source: result.source || "Customer Outstanding Report",
      });
    }

    // =================================================
    // 11. GEMINI -> DYNAMIC SQL
    // =================================================

    if (plan.tool === "query") {
      const result = await runDynamicQuery(plan.sql);

      return respond(res, started, result);
    }

    // =================================================
    // 12. UNSUPPORTED / CLARIFICATION
    // =================================================

    return clarify(
      res,
      started,
      String(
        plan.message ||
          "Additional information is needed to answer accurately.",
      ),
    );
  } catch (error) {
    const status = extractErrorStatus(error);

    console.error("========== AI ERROR ==========");
    console.error("Name:", error.name);
    console.error("Message:", error.message);
    console.error("Status:", status);
    console.error("================================");

    const modelUnavailable =
      [429, 503, 504].includes(status) ||
      /timeout|timed out|deadline/i.test(`${error.name} ${error.message}`);

    // Do not expose SQL query text, credentials,
    // database internals or API secrets to clients.
    return res.status(modelUnavailable ? 503 : 500).json({
      success: false,
      message: modelUnavailable
        ? "AI models are temporarily unavailable. Please retry. Direct ERP reports may still work."
        : "Unable to complete the ERP request. Please check server logs.",
      durationMs: Date.now() - started,
    });
  }
};
