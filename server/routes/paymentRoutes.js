const express = require("express");
const router = express.Router();
const paymentController = require("../controller/paymentController");

router.get("/payment-modes", paymentController.getPaymentModes);
router.post("/payment-status",paymentController.completeOrder);

module.exports = router;
