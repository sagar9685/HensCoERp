const { poolPromise, sql } = require("../utils/db");

// ==================== HELPERS ====================

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

function phone(value) {
  let number = String(value ?? "").replace(/\D/g, "");

  if (number.length === 12 && number.startsWith("91")) {
    number = number.slice(2);
  }

  if (number.length === 11 && number.startsWith("0")) {
    number = number.slice(1);
  }

  return number.length === 10 ? number : null;
}

function weightKg(value) {
  const match = normalize(value).match(
    /^(\d+(?:\.\d+)?|\.\d+)\s*(kg|kgs|kilogram|kilograms|g|gm|gms|gram|grams)$/,
  );

  if (!match || Number(match[1]) <= 0) {
    return null;
  }

  return Number(match[1]) / (match[2].startsWith("k") ? 1 : 1000);
}

const iso = (date) => date.toISOString().slice(0, 10);

function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return Number.isFinite(date.getTime()) && iso(date) === value ? date : null;
}

const addDays = (date, numberOfDays) =>
  iso(
    new Date(new Date(`${date}T00:00:00Z`).getTime() + numberOfDays * 86400000),
  );

const round = (value, decimals = 3) => Number(value.toFixed(decimals));

// ==================== PRODUCT MAPPING ====================

const PRODUCTS = [
  ["tray", "Tray", "Egg", ["tray"]],
  ["box", "Box", "Egg", ["box"]],
  ["kids", "Kids Box", "Egg", ["box (kids)"]],
  ["women", "Women Box", "Egg", ["box (women)"]],

  ["curryCut", "Currycut", "Chicken", ["curry cut"]],
  ["boneless", "Boneless", "Chicken", ["boneless"]],
  ["breast", "Breast", "Chicken", ["breast"]],
  ["tikka", "Tikka", "Chicken", ["tikka"]],
  ["lollipop", "Lollipop", "Chicken", ["lollipop"]],
  ["drumstick", "Drumstick", "Chicken", ["drumstick"]],
  ["wings", "Wings", "Chicken", ["wings"]],
  ["wholeBird", "Whole Bird", "Chicken", ["whole bird"]],
  ["petFood", "Pet Food", "Chicken", ["pet food"]],

  ["restChicken", "Liver + Gizzard", "Chicken", ["liver", "gizzard"]],

  ["fullLeg", "Full Leg", "Chicken", ["full leg"]],

  ["cockrail", "Chicken Cockrail", "Chicken", ["chicken cockrail", "cockrail"]],
].map(([key, label, category, types]) => ({
  key,
  label,
  category,
  types,
}));

const emptyProducts = () =>
  Object.fromEntries(
    PRODUCTS.map((product) => [
      product.key,
      {
        quantity: 0,
        revenue: 0,
      },
    ]),
  );

// ==================== AREA MAPPING ====================

const AREA_GROUPS = [
  ["Adhartal", ["adhartal"]],

  ["Bilhari / Tilhari / Shaliwara", ["bilhari", "tilhari", "shaliwara"]],

  ["Civil Lines", ["civil lines", "civil line"]],

  [
    "Dhanwantri / Garha / Ranital",
    [
      "dhanwantri nagar",
      "dhanvantri nagar",
      "dhanvantari nagar",
      "dhanwantri",
      "garha",
      "ranital",
    ],
  ],

  ["Ghamapur / Ghantaghar", ["ghamapur", "ghantaghar", "ghanta ghar"]],

  ["Gorakhpur / Hathital / Katanga", ["gorakhpur", "hathital", "katanga"]],

  ["Gwarighat", ["gwarighat"]],

  ["Madan Mahal / Medical", ["madan mahal", "medical"]],

  ["Nayagaon / Rampur", ["nayagaon", "naya gaon", "rampur"]],

  ["Napier Town / Wright Town", ["napier town", "wright town"]],

  [
    "Vijay Nagar / Damohnaka / Baldevbag",
    ["vijay nagar", "damohnaka", "damoh naka", "baldevbag", "baldev bag"],
  ],

  ["Ranjhi / Khamariya", ["ranjhi", "khamariya"]],

  ["Other", []],
];

// ==================== REPORT CALCULATION ====================

function buildWeeklyReport({
  startDate,
  items,
  masters,
  customers,
  firstOrders,
  firstDate,
}) {
  // Previous two weeks + selected week.
  const periods = [-14, -7, 0].map((offset) => ({
    start: addDays(startDate, offset),
    end: addDays(startDate, offset + 6),
    products: emptyProducts(),
    revenue: 0,
    orderCount: 0,
    deliveryRevenue: 0,
  }));

  const current = periods[2];
  const endDate = current.end;

  // Product master lookup.
  const master = new Map();

  for (const product of masters) {
    const name = normalize(product.ProductType);

    if (master.has(name)) {
      throw Object.assign(
        new Error(`Duplicate master: ${product.ProductType}`),
        { status: 422 },
      );
    }

    master.set(name, product);
  }

  const supported = Object.fromEntries(
    PRODUCTS.map((product) => [
      product.key,
      product.types.some((type) => master.has(type)),
    ]),
  );

  // Customer lookup by normalized phone number.
  const customerMap = new Map();

  for (const customer of customers) {
    const key = phone(customer.Contact_No);

    if (!key) continue;

    if (!customerMap.has(key)) {
      customerMap.set(key, []);
    }

    customerMap.get(key).push(customer);
  }

  function classify(contact) {
    const key = phone(contact);

    const matches = key ? customerMap.get(key) || [] : [];

    const isBulk = matches.some((customer) => Number(customer.Bulk_Mode) === 1);

    return isBulk ? "bulk" : "retail";
  }

  // Seven daily rows.
  const days = Array.from({ length: 7 }, (_, index) => ({
    date: addDays(startDate, index),
    total: emptyProducts(),
    bulk: emptyProducts(),
    retail: emptyProducts(),
    unknown: emptyProducts(),
  }));

  const split = {
    bulk: emptyProducts(),
    retail: emptyProducts(),
    unknown: emptyProducts(),
  };
  const prices = Object.fromEntries(
    ["bulk", "retail", "unknown", "all"].map((group) => [
      group,
      Object.fromEntries(PRODUCTS.map((product) => [product.key, new Set()])),
    ]),
  );

  const pricesKg = Object.fromEntries(
    PRODUCTS.map((product) => [product.key, new Set()]),
  );

  const areas = AREA_GROUPS.map(([label]) => ({
    label,
    bulk: {
      egg: new Set(),
      chicken: new Set(),
    },
    retail: {
      egg: new Set(),
      chicken: new Set(),
    },
    unknown: {
      egg: new Set(),
      chicken: new Set(),
    },
    amount: 0,
  }));

  const unmappedAreas = new Set();
  const unmatchedOrders = new Set();
  const countedOrders = new Set();
  const issues = [];

  for (const item of items) {
    const date = String(item.OrderDate).slice(0, 10);

    const period = periods.find(
      (entry) => date >= entry.start && date <= entry.end,
    );

    if (!period) continue;

    const name = normalize(item.ProductType);

    const definition = PRODUCTS.find((product) => product.types.includes(name));

    const masterProduct = master.get(name);

    const quantity = Number(item.Quantity);
    const total = Number(item.Total);
    const rate = Number(item.Rate);

    if (
      !definition ||
      !masterProduct ||
      normalize(masterProduct.Category) !== normalize(definition.category) ||
      item.Quantity == null ||
      item.Total == null ||
      item.Rate == null ||
      ![quantity, total, rate].every(Number.isFinite) ||
      quantity < 0 ||
      total < 0
    ) {
      issues.push({
        ItemID: item.ItemID,
        ProductType: item.ProductType,
        message: "Invalid product/category or numeric data",
      });

      continue;
    }

    // Historical item weight takes priority.
    const weight =
      String(item.Weight ?? "").trim() || masterProduct.DefaultWeight;

    const kg = definition.category === "Chicken" ? weightKg(weight) : 1;

    if (kg == null) {
      issues.push({
        ItemID: item.ItemID,
        ProductType: item.ProductType,
        Weight: weight,
        message: "Chicken Weight must be Gram or KG",
      });

      continue;
    }

    const sold = quantity * kg;
    const paise = Math.round(total * 100);
    const key = definition.key;

    const increment = (products) => {
      products[key].quantity += sold;
      products[key].revenue += paise;
    };

    increment(period.products);
    period.revenue += paise;

    // Delivery charge and order count only once per order.
    if (!countedOrders.has(item.OrderID)) {
      countedOrders.add(item.OrderID);
      period.orderCount++;

      const deliveryCharge = Number(item.DeliveryCharge ?? 0);

      if (!Number.isFinite(deliveryCharge)) {
        issues.push({
          OrderID: item.OrderID,
          message: "Invalid DeliveryCharge",
        });
      } else {
        period.deliveryRevenue += Math.round(deliveryCharge * 100);
      }
    }

    // Detailed sections only for selected week.
    if (period !== current) continue;
    const group = item.CustomerGroup === "bulk" ? "bulk" : "retail";

    const day = days.find((entry) => entry.date === date);

    increment(day.total);
    increment(day[group]);
    increment(split[group]);

    const areaName = normalize(item.Area);

    let areaIndex = AREA_GROUPS.findIndex(
      ([label, aliases]) =>
        normalize(label) === areaName || aliases.includes(areaName),
    );

    if (areaIndex < 0) {
      areaIndex = AREA_GROUPS.length - 1;
      unmappedAreas.add(String(item.Area || "(blank)"));
    }

    const area = areas[areaIndex];
    const category = normalize(definition.category);

    // Unique order per category/group.
    area[group][category].add(item.OrderID);

    // Each item contributes its amount once.
    area.amount += paise;

    const price = `₹${rate.toLocaleString("en-IN")} / ${weight}`;

    prices[group][key].add(price);
    prices.all[key].add(price);

    if (definition.category === "Chicken") {
      pricesKg[key].add(`₹${round(rate / kg, 2).toLocaleString("en-IN")} / KG`);
    }
  }

  if (issues.length) {
    throw Object.assign(
      new Error(
        "Report data contains invalid items; correct the listed values first.",
      ),
      {
        status: 422,
        issues: issues.slice(0, 25),
        issueCount: issues.length,
      },
    );
  }

  // Finalize quantities and convert paise to rupees.
  const finish = (products) => {
    for (const value of Object.values(products)) {
      value.quantity = round(value.quantity);
      value.revenue = round(value.revenue / 100, 2);
    }
  };

  for (const period of periods) {
    finish(period.products);

    period.revenue = round(period.revenue / 100, 2);
    period.deliveryRevenue = round(period.deliveryRevenue / 100, 2);

    period.recorded = Boolean(firstDate && period.end >= firstDate);

    period.partialHistory = Boolean(
      firstDate && firstDate > period.start && firstDate <= period.end,
    );
  }

  for (const day of days) {
    for (const group of ["total", "bulk", "retail", "unknown"]) {
      finish(day[group]);
    }
  }

  Object.values(split).forEach(finish);

  for (const area of areas) {
    area.amount = round(area.amount / 100, 2);

    for (const group of ["bulk", "retail", "unknown"]) {
      for (const category of ["egg", "chicken"]) {
        area[group][category] = area[group][category].size;
      }
    }
  }

  for (const group of Object.values(prices)) {
    for (const key of Object.keys(group)) {
      group[key] = [...group[key]].sort();
    }
  }

  for (const key of Object.keys(pricesKg)) {
    pricesKg[key] = [...pricesKg[key]].sort();
  }

  // First recorded buyer per normalized contact.
  const firstPhone = new Map();

  for (const row of firstOrders) {
    const key = phone(row.ContactNo);

    if (key && (!firstPhone.has(key) || row.FirstDate < firstPhone.get(key))) {
      firstPhone.set(key, row.FirstDate);
    }
  }

  const firstBuyers = {
    bulk: 0,
    retail: 0,
    unknown: 0,
  };

  for (const [contact, date] of firstPhone) {
    if (date >= startDate && date <= endDate) {
      firstBuyers[classify(contact)]++;
    }
  }

  return {
    startDate,
    endDate,
    periods,
    current,
    days,
    products: PRODUCTS,
    supported,
    split,
    areas,
    prices,
    pricesKg,
    firstBuyers,
    firstDate: firstDate || null,
    unmatchedOrders: unmatchedOrders.size,
    unmappedAreas: [...unmappedAreas],

    basis: [
      "Seven consecutive dates, inclusive. Previous comparisons use immediately preceding seven-day periods, even across month/year boundaries.",
      "OrderDate basis. Any cancelled assignment excludes the order. Historical item weight takes priority over current master weight.",
      "Collection column = booked product sales (sum of OrderItems.Total), not payment receipts. Delivery is separate; RTV/credit notes are not deducted.",
      "Bulk/Retail classification uses Customers.Bulk_Mode. Bulk_Mode = 1 is treated as Bulk; all other values and unmatched contacts are treated as Retail.",
      "Area counts are DISTINCT OrderIDs per area, category and Bulk/Retail group. An order containing Egg and Chicken appears once in both category counts, while its amount is counted once.",
      "Chicken percentages include all listed chicken products in the denominator. Main Chicken totals/averages exclude Pet Food and Liver/Gizzard.",
      "Daily averages = weekly quantity divided by seven, including zero-sale days. Missing history is N/A, not the reference October sample.",
      "Projected quantities and findings overrides are manual. New buyers are first recorded orders per contact, not customer registrations or acquisition-channel attribution.",
    ],
  };
}

// ==================== WEEKLY REPORT CONTROLLER ====================

const getWeeklyReport = async (req, res) => {
  try {
    const { startDate, endDate: requestedEndDate } = req.query;

    if (
      !parseDate(startDate) ||
      startDate < "1901-01-15" ||
      startDate > "9998-12-17"
    ) {
      return res.status(400).json({
        message: "Valid startDate required (YYYY-MM-DD)",
      });
    }

    const endDate = addDays(startDate, 6);

    if (requestedEndDate && requestedEndDate !== endDate) {
      return res.status(400).json({
        message: `This template requires 7 days. endDate must be ${endDate}`,
      });
    }

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("from", sql.Date, addDays(startDate, -14))
      .input("until", sql.Date, addDays(startDate, 7)).query(`
        -- 1. Selected week + previous two weeks.
     SELECT
  o.OrderID,
  o.CustomerName,
  CONVERT(char(10), o.OrderDate, 23) AS OrderDate,
  o.ContactNo,
  o.Area,
  o.DeliveryCharge,

  CASE
    WHEN EXISTS (
      SELECT 1
      FROM Customers c
      WHERE c.CustomerName = o.CustomerName
        AND c.Bulk_Mode = 1
    )
    THEN 'bulk'
    ELSE 'retail'
  END AS CustomerGroup,

  oi.ItemID,
  oi.ProductType,
  oi.Weight,
  oi.Quantity,
  oi.Rate,
  oi.Total

FROM OrdersTemp o

INNER JOIN OrderItems oi
  ON oi.OrderID = o.OrderID

WHERE o.OrderDate >= @from
  AND o.OrderDate < @until

  AND NOT EXISTS (
    SELECT 1
    FROM AssignedOrders a
    WHERE a.OrderID = o.OrderID
      AND LOWER(
        LTRIM(RTRIM(ISNULL(a.DeliveryStatus, '')))
      ) IN ('cancel', 'cancelled', 'canceled')
  );

        -- 2. Product master.
        SELECT
          ProductType,
          DefaultWeight,
          Category
        FROM ProductTypes;

        -- 3. Customer Bulk/Retail mapping.
        SELECT
          CustomerId,
            CustomerName,
          Contact_No,
          Bulk_Mode
        FROM Customers;

        -- 4. First recorded non-cancelled order per contact.
        SELECT
          o.ContactNo,
          CONVERT(
            char(10),
            MIN(o.OrderDate),
            23
          ) AS FirstDate

        FROM OrdersTemp o

        WHERE EXISTS (
          SELECT 1
          FROM OrderItems oi
          WHERE oi.OrderID = o.OrderID
        )

        AND NOT EXISTS (
          SELECT 1
          FROM AssignedOrders a
          WHERE a.OrderID = o.OrderID
            AND LOWER(
              LTRIM(RTRIM(ISNULL(a.DeliveryStatus, '')))
            ) IN ('cancel', 'cancelled', 'canceled')
        )

        GROUP BY o.ContactNo;

        -- 5. Earliest available non-cancelled order.
        SELECT
          CONVERT(
            char(10),
            MIN(o.OrderDate),
            23
          ) AS FirstDate

        FROM OrdersTemp o

        WHERE EXISTS (
          SELECT 1
          FROM OrderItems oi
          WHERE oi.OrderID = o.OrderID
        )

        AND NOT EXISTS (
          SELECT 1
          FROM AssignedOrders a
          WHERE a.OrderID = o.OrderID
            AND LOWER(
              LTRIM(RTRIM(ISNULL(a.DeliveryStatus, '')))
            ) IN ('cancel', 'cancelled', 'canceled')
        );
      `);

    const report = buildWeeklyReport({
      startDate,
      items: result.recordsets[0],
      masters: result.recordsets[1],
      customers: result.recordsets[2],
      firstOrders: result.recordsets[3],
      firstDate: result.recordsets[4][0]?.FirstDate,
    });

    return res.status(200).json(report);
  } catch (error) {
    console.error("Weekly performance report:", error);

    return res.status(error.status || 500).json({
      message: error.status ? error.message : "Unable to load weekly report",

      ...(error.issues
        ? {
            issues: error.issues,
            issueCount: error.issueCount,
          }
        : {}),
    });
  }
};

// ==================== EXPORT ====================

module.exports = {
  getWeeklyReport,
};
