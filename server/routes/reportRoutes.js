const express = require("express");
const router = express.Router();
const {
  getMonthlyReport,

  getDailyReport,
  getCustomerWiseSummaryByDate,
  getCustomerLedgerByDate,
  getCustomerLedger,
  getMonthlyCompareReport,
  getWeeklyCompareReport,
  getCustomerWiseDateRangeReport,
} = require("../controller/reportController");

router.get("/monthly", getMonthlyReport);

router.get("/daily", getDailyReport);
router.get("/customer-summary", getCustomerWiseSummaryByDate);
router.get("/customer-ledger", getCustomerLedger);
router.get("/monthlycompare", getMonthlyCompareReport);
router.get("/weeklycompare", getWeeklyCompareReport);
router.get("/customer-report", getCustomerWiseDateRangeReport);

router.get("/customer-ledgers", getCustomerLedgerByDate);

module.exports = router;
