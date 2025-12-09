const express = require("express");
const router = express.Router();
const stockController = require("../controller/stockController");
// ADD STOCK
router.post("/add", stockController.addStock);
router.get("/", stockController.getStock);


module.exports = router;
