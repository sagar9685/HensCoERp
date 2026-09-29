const express = require("express");

const { getWeeklyReport } = require("../controller/weeklyReportController");

const router = express.Router();

// Existing authentication/authorization middleware ho,
// toh doosre report routes ki tarah yahan bhi lagao.
router.get("/weekly", getWeeklyReport);

module.exports = router;
