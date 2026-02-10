const express = require("express");
const router = express.Router();
const productionController = require("../controller/productionConroller");

router.get("/", productionController.HeadDailySale);

module.exports = router;
