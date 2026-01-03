const express = require("express");
const router = express.Router();
const {
  getMonthlyReport,
  getWeeklyReport
} = require("../controller/reportController");

router.get("/monthly", getMonthlyReport);
router.get("/weekly", getWeeklyReport);

module.exports = router;
