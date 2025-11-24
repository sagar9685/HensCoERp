const express = require("express");
const router = express.Router();
const paymentController = require("../controller/paymentController");

router.get("/payment-modes", paymentController.getPaymentModes);
router.post("/payment-status",paymentController.completeOrder);
router.get("/cash-history", paymentController.getCashHistory);
router.get("/cash-balance", paymentController.getAllCashBalance);
router.post("/denominations", paymentController.addDenominations);
 router.post("/handover", paymentController.handoverCash);


module.exports = router;
