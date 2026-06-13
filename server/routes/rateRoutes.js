const express = require("express");
const router = express.Router();
const rateController = require("../controller/rateController");

// ✅ GET all rate history
router.get("/", rateController.getAllRateHistory);

// ✅ POST new rate
router.post("/", rateController.addRate);

router.get("/type/:productType", rateController.getRateByProductType);

router.put("/update-order-rate", rateController.updateOrderRate);

module.exports = router;
