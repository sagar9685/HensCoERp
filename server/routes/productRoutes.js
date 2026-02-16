const express = require("express");

const router = express.Router();

const productController = require("../controller/productController");

router.get("/types", productController.getAllProductTypes);
router.get("/weight/:type", productController.getWeightByProductType);
// router file mein add karein
router.get("/upc/:type", productController.getUPCByProductType); // 👈 Ye line missing thi

module.exports = router;
