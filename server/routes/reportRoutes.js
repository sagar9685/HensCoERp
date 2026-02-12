const express = require("express");
const router = express.Router();
const {
  getMonthlyReport,
  getWeeklyReport,
  getDailyReport,
  getCustomerWiseSummaryByDate,
  getCustomerLedger,
} = require("../controller/reportController");

router.get("/monthly", getMonthlyReport);
router.get("/weekly", getWeeklyReport);
router.get("/daily", getDailyReport);
router.get("/customer-summary", getCustomerWiseSummaryByDate);
router.get("/customer-ledger", getCustomerLedger);

module.exports = router;
