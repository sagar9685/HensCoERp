const express = require("express");
const router = express.Router();
const deliveryController = require("../controller/deliveryMenController");

router.get("/delivery-men", deliveryController.getDeliveryMen);
router.post("/delivery-men", deliveryController.addDeliveryMan); 
router.get("/cash", deliveryController.getDeliveryMenCash);

module.exports = router;
