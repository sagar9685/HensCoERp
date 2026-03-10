const express = require("express");
const router = express.Router();
const productionController = require("../controller/productionController");

router.post("/", productionController.addProduction);

module.exports = router;
