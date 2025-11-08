const express = require('express');


const router = express.Router();

 const productController = require('../controller/productController')

router.get('/types', productController.getAllProductTypes);
router.get('/weight/:type', productController.getWeightByProductType);

module.exports = router;
