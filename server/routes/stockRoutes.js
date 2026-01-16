const express = require("express");
const router = express.Router();

const stockController = require("../controller/stockController");

router.post("/add", stockController.addStock);
router.get("/", stockController.getStock);
router.get("/avilable", stockController.getAvailableStock);
router.post("/rejected-stock", stockController.rejectStock);

module.exports = router;
