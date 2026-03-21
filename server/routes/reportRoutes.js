const express = require("express");
const router = express.Router();
const {
  getMonthlyReport,
  getWeeklyReport,
  getDailyReport,
  getCustomerWiseSummaryByDate,
  getCustomerLedger,
  getMonthlyCompareReport,
  getWeeklyCompareReport,
} = require("../controller/reportController");

router.get("/monthly", getMonthlyReport);
router.get("/weekly", getWeeklyReport);
router.get("/daily", getDailyReport);
router.get("/customer-summary", getCustomerWiseSummaryByDate);
router.get("/customer-ledger", getCustomerLedger);
router.get("/monthlycompare", getMonthlyCompareReport);
router.get("/weeklycompare", getWeeklyCompareReport);

module.exports = router;
