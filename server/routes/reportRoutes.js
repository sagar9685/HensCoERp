const express = require("express");
const router = express.Router();
const {
  getMonthlyReport,
  getWeeklyReport,
  getDailyReport,
} = require("../controller/reportController");

router.get("/monthly", getMonthlyReport);
router.get("/weekly", getWeeklyReport);
router.get("/daily",getDailyReport)

module.exports = router;
