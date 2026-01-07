const express = require("express");
const router = express.Router();
const {
  getCustomerOrderFrequencyWeekWise,
  getCustomerOrderFrequencyMonthWise,
  getCustomerOrderFrequencyYearWise,
} = require("../controller/customerAnalysisController");

router.get("/week-wise", getCustomerOrderFrequencyWeekWise);
router.get("/month-wise", getCustomerOrderFrequencyMonthWise);
router.get("/year-wise", getCustomerOrderFrequencyYearWise);

module.exports = router;
