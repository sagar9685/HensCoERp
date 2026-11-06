// Reuse existing report business logic rather than duplicating accounting formulas.
const reports = require('../controller/reportController');

async function invokeController(handler, query, user) {
  return new Promise((resolve, reject) => {
    let completed = false;
    const response = {
      status(code) { this.statusCode = code; return this; },
      json(value) {
        if (completed) return this;
        completed = true;
        if ((this.statusCode || 200) >= 400) reject(new Error(value?.message || 'Report failed'));
        else resolve(value);
        return this;
      }
    };
    Promise.resolve(handler({ query, user }, response)).then(() => {
      if (!completed) reject(new Error('Report controller returned no response'));
    }).catch(reject);
  });
}

async function monthly(year, month, user) {
  const body = await invokeController(reports.getMonthlyReport, { year, month }, user);
  const s = body.summary;
  return {
    message: `Monthly report ${year}-${String(month).padStart(2,'0')}: ${s.TotalOrders} orders, gross sales ₹${s.GrossSales}, net sales ₹${s.TotalSales}, received ₹${s.TotalReceived}, outstanding ₹${s.TotalOutstanding}.`,
    data: [{
      Month: `${year}-${String(month).padStart(2,'0')}`,
      Orders: s.TotalOrders, GrossSales: s.GrossSales,
      NetSales: s.TotalSales, Received: s.TotalReceived,
      Outstanding: s.TotalOutstanding, FOC: s.FOCAmount,
      Credit: s.CreditAmount, Debit: s.DebitAmount, RTV: s.RTVAmount
    }],
    source: 'existing getMonthlyReport',
    detail: body
  };
}

async function customerOutstanding({ from, to, customerName, area }, user) {
  const body = await invokeController(reports.getCustomerOutstanding,
    { from, to, customerName, area }, user);
  const s = body.Summary;
  return {
    message: `Customer outstanding report: sales ₹${s.TotalSales}, received ₹${s.TotalReceived}, outstanding ₹${s.TotalOutstanding}, pending verification ₹${s.PendingVerification}. Pending verification is separate from unpaid balance.`,
    data: (body.Customers || []).slice(0, 100).map(row => {
      const safe = {};
      for (const key of ['CustomerName','Area','TotalOrders','TotalSales','TotalReceived','TotalOutstanding','Outstanding','Balance','PendingVerification','VerifiedAmount','ShortAmount']) {
        if (Object.prototype.hasOwnProperty.call(row,key)) safe[key] = row[key];
      }
      return safe;
    }),
    rowCount: body.TotalCustomers,
    source: 'existing getCustomerOutstanding',
    totals: s
  };
}
module.exports = { monthly, customerOutstanding };
